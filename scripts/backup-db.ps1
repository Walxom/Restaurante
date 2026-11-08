# ==============================================================================
# Script de Respaldo Local de Base de Datos SQLite (SIGER-IA)
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1 -DestinoExtra "E:\Backups"
# ==============================================================================

param(
    [string]$DestinoExtra = ""
)

$ErrorActionPreference = "Stop"

# Directorio raíz del proyecto
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$PrismaDbPath = Join-Path $ProjectRoot "prisma\dev.db"
$RootDbPath   = Join-Path $ProjectRoot "dev.db"

# Localizar el archivo dev.db activo
$SourceDb = $null
if (Test-Path $PrismaDbPath) {
    $SourceDb = $PrismaDbPath
} elseif (Test-Path $RootDbPath) {
    $SourceDb = $RootDbPath
} else {
    Write-Host "[ERROR] No se encontro la base de datos dev.db ni en 'prisma/' ni en la raiz." -ForegroundColor Red
    Write-Host "Ejecuta primero: pnpm db:setup" -ForegroundColor Yellow
    exit 1
}

# Crear directorio backups si no existe
$BackupsDir = Join-Path $ProjectRoot "backups"
if (-not (Test-Path $BackupsDir)) {
    New-Item -ItemType Directory -Path $BackupsDir -Force | Out-Null
}

# Generar nombre con timestamp YYYYMMDD_HHMMSS
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFileName = "dev_backup_$Timestamp.db"
$LocalBackupPath = Join-Path $BackupsDir $BackupFileName

Write-Host "`n📦 Iniciando respaldo de base de datos..." -ForegroundColor Cyan
Write-Host "   Origen:  $SourceDb" -ForegroundColor DarkGray
Write-Host "   Destino: $LocalBackupPath" -ForegroundColor DarkGray

# Copia de seguridad segura
try {
    Copy-Item -Path $SourceDb -Destination $LocalBackupPath -Force
    $FileSize = (Get-Item $LocalBackupPath).Length / 1KB
    Write-Host "✔ Respaldo local generado exitosamente: $BackupFileName ($([math]::Round($FileSize, 2)) KB)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] No se pudo crear la copia local: $_" -ForegroundColor Red
    exit 1
}

# Copia a almacenamiento secundario/USB si se especificó
if ($DestinoExtra -ne "") {
    Write-Host "`n💾 Generando copia en almacenamiento secundario/USB..." -ForegroundColor Cyan
    try {
        if (-not (Test-Path $DestinoExtra)) {
            New-Item -ItemType Directory -Path $DestinoExtra -Force | Out-Null
        }
        $ExtraBackupPath = Join-Path $DestinoExtra $BackupFileName
        Copy-Item -Path $SourceDb -Destination $ExtraBackupPath -Force
        Write-Host "✔ Copia secundaria guardada en: $ExtraBackupPath" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Advertencia: No se pudo completar la copia secundaria a '$DestinoExtra': $_" -ForegroundColor Yellow
    }
}

Write-Host "🎉 Proceso de respaldo finalizado correctamente.`n" -ForegroundColor Green
