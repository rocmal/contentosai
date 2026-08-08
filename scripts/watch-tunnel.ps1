<#
.SYNOPSIS
  Watchdog for the Cloudflare quick tunnel fronting the Lumora API in local dev.

.DESCRIPTION
  Quick tunnels (trycloudflare.com, no Cloudflare account) have "no uptime
  guarantee" - cloudflared can silently drop into a reconnect loop after a
  network blip and never recover, while the process itself stays alive. Since
  avatar image URLs and other public-facing links are baked into the DB as
  absolute {APP_URL}/... URLs (see the "absolutize-demo-avatar-images" seeder
  and local-storage.provider.ts), a dead tunnel quietly breaks avatar
  thumbnails and character-video generation without touching localhost.

  This script polls the current tunnel's public health endpoint. On failure it
  self-heals: kills and restarts cloudflared, captures the new random
  *.trycloudflare.com URL, writes it into .env.development as APP_URL,
  restarts the API dev server so it picks up the new value, and re-runs the
  avatar-image seeder so existing DB rows point at the new URL.

.USAGE
  Leave this running in its own window for the duration of a dev session:
    powershell -ExecutionPolicy Bypass -File scripts\watch-tunnel.ps1

  Or launch it detached/hidden:
    Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File "D:\xampp\htdocs\contentosai\scripts\watch-tunnel.ps1"' -WindowStyle Hidden
#>

param(
    [int]$PollSeconds = 90,
    [string]$ApiDir = "D:\xampp\htdocs\contentosai\apps\api",
    [string]$CloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe",
    [int]$LocalPort = 3001
)

$envFile = Join-Path $ApiDir ".env.development"
$logFile = Join-Path $PSScriptRoot "watch-tunnel.log"
$tunnelLog = Join-Path $PSScriptRoot "cloudflared.log"
$seedName = "20260731200000-absolutize-demo-avatar-images.js"

# Windows PowerShell 5.1's Invoke-WebRequest defaults to an old
# SecurityProtocol that Cloudflare's edge rejects the TLS handshake for -
# without this, every health check fails even when the tunnel is fine,
# and the watchdog tears down a healthy tunnel on every single poll.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

function Get-CurrentAppUrl {
    $line = Get-Content $envFile | Where-Object { $_ -match '^APP_URL=' } | Select-Object -First 1
    if ($line -match '^APP_URL=(.+)$') { return $matches[1].Trim() }
    return $null
}

function Test-TunnelHealthy($url) {
    if (-not $url) { return $false }
    # Invoke-WebRequest/.NET's HttpWebRequest is unreliable against
    # trycloudflare.com in this environment (hangs to timeout even when the
    # tunnel is demonstrably fine via curl - likely IPv6 preference/proxy
    # quirks in the .NET stack here) - shell out to curl.exe instead, which
    # works consistently.
    $httpCode = & curl.exe -s -o NUL -w "%{http_code}" --max-time 12 "$url/api/v1/health" 2>$null
    return $httpCode -eq "200"
}

function Start-NewTunnel {
    Write-Log "Starting a fresh cloudflared tunnel..."
    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

    Start-Process -FilePath $CloudflaredExe `
        -ArgumentList "tunnel --url http://localhost:$LocalPort" `
        -RedirectStandardError $tunnelLog -RedirectStandardOutput $tunnelLog -WindowStyle Hidden

    $newUrl = $null
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        if (Test-Path $tunnelLog) {
            $match = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($match) { $newUrl = $match.Matches[0].Value; break }
        }
    }

    if (-not $newUrl) {
        Write-Log "ERROR: could not read new tunnel URL from cloudflared output after 60s - will retry next cycle."
        return $null
    }
    Write-Log "New tunnel URL: $newUrl"
    return $newUrl
}

function Update-AppUrl($newUrl) {
    (Get-Content $envFile) -replace '^APP_URL=.*$', "APP_URL=$newUrl" | Set-Content $envFile
    Write-Log "Updated APP_URL in .env.development"
}

function Restart-Api {
    Write-Log "Restarting API dev server..."
    $conns = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2

    Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd /d `"$ApiDir`" && npm run start:dev" -WindowStyle Hidden

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 3
        if (Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue) {
            Write-Log "API is listening on port $LocalPort again."
            return $true
        }
    }
    Write-Log "WARNING: API did not come back up within 180s."
    return $false
}

function Reseed-AvatarUrls {
    Write-Log "Re-seeding avatar image URLs..."
    Push-Location $ApiDir
    & npx sequelize-cli db:seed:undo --seed $seedName *> $null
    & npx sequelize-cli db:seed --seed $seedName *> $null
    Pop-Location
    Write-Log "Avatar URLs re-seeded."
}

Write-Log "Tunnel watchdog started. Polling every $PollSeconds seconds. Log: $logFile"

while ($true) {
    $currentUrl = Get-CurrentAppUrl
    if (Test-TunnelHealthy $currentUrl) {
        Write-Log "Tunnel healthy ($currentUrl)."
    } else {
        Write-Log "Tunnel unhealthy (last known URL: $currentUrl). Self-healing..."
        $newUrl = Start-NewTunnel
        if ($newUrl) {
            Update-AppUrl $newUrl
            if (Restart-Api) {
                Start-Sleep -Seconds 3
                Reseed-AvatarUrls
                Write-Log "Recovery complete."
            }
        }
    }
    Start-Sleep -Seconds $PollSeconds
}
