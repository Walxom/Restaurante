# ==============================================================================
# Script de Respaldo Transaccional Seguro de Base de Datos SQLite (SIGER-IA)
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1 -DestinoExtra "E:\Backups"
# ==============================================================================

param(
    [string]$DestinoExtra = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackupScript = Join-Path $ProjectRoot "scripts\backup-db.js"

if (-not (Test-Path $BackupScript)) {
    Write-Host "[ERROR] No se encontro scripts/backup-db.js" -ForegroundColor Red
    exit 1
}

if ($DestinoExtra -ne "") {
    node $BackupScript --extra $DestinoExtra
} else {
    node $BackupScript
}

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
