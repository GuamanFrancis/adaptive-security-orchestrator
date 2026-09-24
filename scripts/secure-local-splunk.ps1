#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$configPath = 'C:\Program Files\Splunk\etc\splunk-launch.conf'
if (-not (Test-Path -LiteralPath $configPath)) {
  throw "No se encontró splunk-launch.conf en la instalación estándar."
}

$current = Get-Content -LiteralPath $configPath
$binding = @($current | Where-Object { $_ -match '^\s*SPLUNK_BINDIP\s*=' })
if ($binding.Count -gt 1) {
  throw 'Hay más de un SPLUNK_BINDIP; revisa el archivo manualmente antes de continuar.'
}
if ($binding.Count -eq 1 -and $binding[0] -notmatch '^\s*SPLUNK_BINDIP\s*=\s*127\.0\.0\.1\s*$') {
  throw 'Existe un SPLUNK_BINDIP diferente; no se modificó la configuración.'
}

if ($binding.Count -eq 0) {
  $backupPath = "$configPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item -LiteralPath $configPath -Destination $backupPath
  Add-Content -LiteralPath $configPath -Value "`r`nSPLUNK_BINDIP=127.0.0.1" -Encoding Ascii
  Write-Host "Configuración respaldada en $backupPath"
}

Restart-Service -Name Splunkd
$service = Get-Service -Name Splunkd
if ($service.Status -ne 'Running') { throw 'Splunkd no quedó en ejecución.' }

$listeners = @()
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  $listeners = @(Get-NetTCPConnection -LocalPort 8088 -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -gt 0) { break }
  Start-Sleep -Seconds 1
}
if ($listeners.Count -eq 0) { throw 'HEC no está escuchando en 8088 después del reinicio.' }
if (@($listeners | Where-Object { $_.LocalAddress -ne '127.0.0.1' }).Count -gt 0) {
  throw 'HEC todavía escucha fuera de 127.0.0.1; revisa la configuración.'
}
Write-Host 'Splunkd Running; HEC limitado a 127.0.0.1:8088.'
