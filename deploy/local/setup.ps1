<#
  Local https://lumoraos.in on this PC: Docker stack + XAMPP Apache + self-signed certificate + hosts file.
  Safe to run again; every step skips what is already done. See README.md next to this file.

    .\setup.ps1                 # everything (hosts file only when run as Administrator)
    .\setup.ps1 -Hosts off      # point lumoraos.in back at the real (production) site
    .\setup.ps1 -Hosts on       # point lumoraos.in at this PC again
#>
param(
  [ValidateSet('on', 'off', '')]
  [string]$Hosts = ''
)

$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 turns anything a native tool writes to stderr (openssl progress, docker build logs)
# into a terminating error under 'Stop'. Native tools are checked through $LASTEXITCODE instead.
function Invoke-Native([scriptblock]$cmd) {
  $ErrorActionPreference = 'Continue'
  & $cmd 2>&1 | ForEach-Object { "$_" }
}
$here = $PSScriptRoot
$xampp = 'C:\xampp'
$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsLine = '127.0.0.1 lumoraos.in www.lumoraos.in # lumora-local'
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)

function Set-HostsEntry([bool]$enable) {
  if (-not $isAdmin) {
    Write-Warning "Editing the hosts file needs Administrator. Re-run in an elevated PowerShell: .\setup.ps1 -Hosts $(if ($enable) { 'on' } else { 'off' })"
    return
  }
  $lines = @(Get-Content $hostsFile | Where-Object { $_ -notmatch '# lumora-local$' })
  if ($enable) { $lines += $hostsLine }
  Set-Content -Path $hostsFile -Value $lines -Encoding ascii
  ipconfig /flushdns | Out-Null
  Write-Host "hosts: lumoraos.in -> $(if ($enable) { '127.0.0.1 (this PC)' } else { 'the real site' })"
}

if ($Hosts) {
  Set-HostsEntry ($Hosts -eq 'on')
  exit 0
}

# 1. Env files with random secrets ------------------------------------------------------------
foreach ($name in 'api', 'web') {
  $target = Join-Path $here ".env.$name"
  if (-not (Test-Path $target)) {
    $text = Get-Content (Join-Path $here ".env.$name.example") -Raw
    while ($text -match '__RANDOM__') {
      $bytes = New-Object byte[] 32
      [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
      $text = ([regex]'__RANDOM__').Replace($text, ([BitConverter]::ToString($bytes) -replace '-', '').ToLower(), 1)
    }
    Set-Content -Path $target -Value $text -Encoding ascii -NoNewline
    Write-Host "created .env.$name"
  }
}

# 2. Self-signed certificate (XAMPP's OpenSSL) and trust it for this Windows user -------------
$certs = Join-Path $here 'certs'
$crt = Join-Path $certs 'lumoraos.in.crt'
$key = Join-Path $certs 'lumoraos.in.key'
if (-not (Test-Path $crt)) {
  New-Item -ItemType Directory -Force $certs | Out-Null
  $env:OPENSSL_CONF = "$xampp\apache\conf\openssl.cnf"
  Invoke-Native {
    & "$xampp\apache\bin\openssl.exe" req -x509 -newkey rsa:2048 -nodes -sha256 -days 825 `
      -keyout $key -out $crt -subj '/CN=lumoraos.in/O=Lumora local' `
      -addext 'subjectAltName=DNS:lumoraos.in,DNS:www.lumoraos.in' `
      -addext 'extendedKeyUsage=serverAuth'
  } | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'openssl failed' }
  Write-Host 'created certs/lumoraos.in.crt'
}
$thumb = (New-Object Security.Cryptography.X509Certificates.X509Certificate2 $crt).Thumbprint
$trusted = @(Get-ChildItem Cert:\CurrentUser\Root, Cert:\LocalMachine\Root | Where-Object Thumbprint -eq $thumb).Count -gt 0
if (-not $trusted) {
  # Chrome and Edge use the Windows store; Firefox has its own (see README). As Administrator the machine store
  # needs no dialog; the per-user store always asks for confirmation, which fails in a non-interactive shell.
  try {
    $store = if ($isAdmin) { 'Cert:\LocalMachine\Root' } else { 'Cert:\CurrentUser\Root' }
    Import-Certificate -FilePath $crt -CertStoreLocation $store | Out-Null
    Write-Host "trusted the certificate ($store)"
  } catch {
    Write-Warning "Could not trust the certificate ($($_.Exception.Message)). Run this script as Administrator, or double-click certs\lumoraos.in.crt > Install Certificate > Current User > Trusted Root Certification Authorities."
  }
}

# 3. XAMPP Apache vhost ------------------------------------------------------------------------
$vhosts = "$xampp\apache\conf\extra\httpd-vhosts.conf"
$include = "Include `"$($here -replace '\\', '/')/apache/lumoraos.in.conf`""
if (-not (Select-String -Path $vhosts -SimpleMatch $include -Quiet)) {
  Add-Content -Path $vhosts -Value "`r`n# Lumora local (deploy/local/setup.ps1)`r`n$include" -Encoding ascii
  Write-Host 'added the lumoraos.in vhost to XAMPP'
}
Invoke-Native { & "$xampp\apache\bin\httpd.exe" -t }
if ($LASTEXITCODE -ne 0) { throw 'Apache config test failed' }

# 4. Hosts file --------------------------------------------------------------------------------
if (-not (Select-String -Path $hostsFile -Pattern '# lumora-local$' -Quiet)) { Set-HostsEntry $true }

# 5. Docker stack ------------------------------------------------------------------------------
Invoke-Native { docker compose -f (Join-Path $here 'docker-compose.yml') up -d --build } | Select-Object -Last 15
if ($LASTEXITCODE -ne 0) { throw 'docker compose failed' }

Write-Host ''
Write-Host 'Done. Start (or restart) Apache in the XAMPP Control Panel, then open https://lumoraos.in'
Write-Host 'Demo login: admin@lumora.ai / Admin@12345'
