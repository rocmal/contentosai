<#
  Development mode: run the API, web app and mobile app from source with live reload, against the
  Docker MySQL and Redis of the local stack. See README.md next to this file.

    .\dev.ps1               # start dev mode (opens a window each for API, web and Expo)
    .\dev.ps1 -NoMobile     # API and web only
    .\dev.ps1 -Stop         # stop dev servers and bring back the Docker copy at https://lumoraos.in

  Dev URLs: web http://localhost:3100, API http://localhost:3000/api/v1 (docs: /api/docs if enabled),
  phone (Expo Go, same Wi-Fi): scan the QR code in the Expo window.
#>
param(
  [switch]$Stop,
  [switch]$NoMobile
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = (Resolve-Path (Join-Path $here '..\..')).Path
$compose = Join-Path $here 'docker-compose.yml'

# Windows PowerShell 5.1 treats native stderr as an error under 'Stop'; native tools are checked via $LASTEXITCODE.
function Invoke-Native([scriptblock]$cmd) {
  $ErrorActionPreference = 'Continue'
  & $cmd 2>&1 | ForEach-Object { "$_" }
}

function Wait-Docker {
  Invoke-Native { docker info --format '{{.ServerVersion}}' } | Out-Null
  if ($LASTEXITCODE -eq 0) { return }
  $desktop = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $desktop)) { throw 'Docker is not running and Docker Desktop was not found.' }
  Write-Host 'starting Docker Desktop ...'
  Start-Process $desktop
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 3
    Invoke-Native { docker info --format '{{.ServerVersion}}' } | Out-Null
    if ($LASTEXITCODE -eq 0) { return }
  }
  throw 'Docker Desktop did not start within 3 minutes.'
}

function Stop-Port([int]$port) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Wait-Docker

if ($Stop) {
  foreach ($p in 3000, 3100, 8081) { Stop-Port $p }
  Invoke-Native { docker compose -f $compose up -d api web } | Select-Object -Last 3
  Write-Host 'Dev servers stopped. The Docker copy is back at https://lumoraos.in'
  exit 0
}

# Sets KEY=value in an env file, replacing an existing line or appending one.
function Set-EnvValue([string]$file, [string]$key, [string]$value) {
  $lines = @(if (Test-Path $file) { Get-Content $file })
  $found = $false
  $lines = $lines | ForEach-Object {
    if ($_ -match "^$([regex]::Escape($key))=") { $found = $true; "$key=$value" } else { $_ }
  }
  if (-not $found) { $lines = @($lines) + "$key=$value" }
  Set-Content -Path $file -Value $lines -Encoding ascii
}

$lanIp = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | Select-Object -First 1).IPv4Address.IPAddress
if (-not $lanIp) { $lanIp = 'localhost' }

# 1. Database and Redis stay in Docker; the app containers give their ports to the dev servers.
if (-not (Test-Path (Join-Path $here '.env.api'))) { throw 'Run setup.ps1 once first (it creates .env.api and the database).' }
Invoke-Native { docker compose -f $compose up -d --wait mysql redis } | Select-Object -Last 2
if ($LASTEXITCODE -ne 0) { throw 'MySQL/Redis did not start - check Docker Desktop.' }
Invoke-Native { docker compose -f $compose stop api web } | Select-Object -Last 2

# 2. API env for dev: starts from the Docker copy's settings (same secrets and vendor keys), then points at the
#    host-mapped database ports. APP_URL uses the LAN address so the phone can load uploaded images and videos.
$apiEnv = Join-Path $root 'apps\api\.env.development'
if (-not (Test-Path $apiEnv)) {
  Copy-Item (Join-Path $here '.env.api') $apiEnv
  Write-Host 'created apps/api/.env.development (from deploy/local/.env.api)'
}
$settings = [ordered]@{
  APP_ENV = 'development'; NODE_ENV = 'development'; APP_HOST = '0.0.0.0'; APP_PORT = '3000'
  APP_URL = "http://${lanIp}:3000"; FRONTEND_URL = 'http://localhost:3100'
  DB_HOST = '127.0.0.1'; DB_PORT = '3307'; DB_USER = 'root'; DB_PASSWORD = 'root'; DB_NAME = 'lumora'
  REDIS_HOST = '127.0.0.1'; REDIS_PORT = '6379'
}
foreach ($k in $settings.Keys) { Set-EnvValue $apiEnv $k $settings[$k] }

# The web server's own /api/* AI routes read the root .env; reuse the Docker copy's web settings.
$webEnv = Join-Path $root '.env'
if (-not (Test-Path $webEnv) -and (Test-Path (Join-Path $here '.env.web'))) { Copy-Item (Join-Path $here '.env.web') $webEnv }

# 3. Dependencies (npm ci only installs; it never rewrites the lock files).
foreach ($dir in @($root, (Join-Path $root 'apps\api')) + $(if ($NoMobile) { @() } else { @(Join-Path $root 'apps\mobile') })) {
  if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
    Write-Host "installing dependencies in $dir ..."
    Push-Location $dir; Invoke-Native { npm ci --no-audit --no-fund } | Select-Object -Last 1; Pop-Location
  }
}

# 4. New migrations and seeders from your branch.
Push-Location (Join-Path $root 'apps\api')
$env:APP_ENV = 'development'
Invoke-Native { npm run db:migrate } | Select-String -Pattern 'migrated|ERROR|No migrations' | ForEach-Object { "$_" }
Invoke-Native { npm run db:seed } | Select-String -Pattern 'migrated|ERROR' | ForEach-Object { "$_" }
Pop-Location
if ($LASTEXITCODE -ne 0) { throw 'Migrations or seeders failed - see the output above.' }

# 5. One window per dev server, each reloading on save. Servers from an earlier run are stopped first, so running
#    this again (for example after switching Wi-Fi, which changes the LAN address) just restarts them.
foreach ($p in 3000, 3100, 8081) { Stop-Port $p }
function Start-DevWindow([string]$title, [string]$dir, [string]$command) {
  $script = "`$host.UI.RawUI.WindowTitle = '$title'; Set-Location '$dir'; $command"
  Start-Process powershell.exe -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $script
}
Start-DevWindow 'Lumora API (3000)' (Join-Path $root 'apps\api') "`$env:APP_ENV='development'; npm run start:dev"
Start-DevWindow 'Lumora web (3100)' $root "`$env:PORT='3100'; `$env:VITE_API_URL='http://localhost:3000'; npm run dev"
if (-not $NoMobile) {
  Start-DevWindow 'Lumora mobile (Expo)' (Join-Path $root 'apps\mobile') "Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue; npx expo start"
}

Write-Host ''
Write-Host 'Dev mode is starting (give the API about 30 seconds):'
Write-Host '  Web:    http://localhost:3100   (admin@lumora.ai / Admin@12345)'
Write-Host "  API:    http://localhost:3000/api/v1/health   (phone uses http://${lanIp}:3000)"
if (-not $NoMobile) { Write-Host '  Mobile: install Expo Go on the phone, same Wi-Fi as this PC, scan the QR code in the Expo window' }
Write-Host 'Stop with .\dev.ps1 -Stop'
