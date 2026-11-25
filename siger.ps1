<#
.SYNOPSIS
    SIGER-IA — despliegue y operación con Docker en Windows 10/11.

.DESCRIPTION
    .\siger.ps1                       instala o actualiza los contenedores y los deja en marcha
    .\siger.ps1 estado                estado de los contenedores y salud del sistema
    .\siger.ps1 respaldar             copia consistente de la base en .\backups\
    .\siger.ps1 restaurar ARCHIVO     reemplaza la base por un respaldo (antes respalda la actual)
    .\siger.ps1 actualizar [vX.Y.Z]   respalda, descarga la versión indicada (o la última) y reinstala
    .\siger.ps1 logs                  registros en vivo (Ctrl+C para salir)
    .\siger.ps1 detener               detiene los contenedores sin borrar datos

    Si PowerShell bloquea el script:  powershell -ExecutionPolicy Bypass -File .\siger.ps1
#>
param(
    [Parameter(Position = 0)][string]$Comando = "instalar",
    [Parameter(Position = 1)][string]$Argumento = ""
)

# "Continue": Docker escribe su progreso en stderr y Windows PowerShell 5.1 lo trataría
# como error. Los fallos se detectan con $LASTEXITCODE.
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

$Puerto = $env:WEB_PORT
if (-not $Puerto -and (Test-Path .env)) {
    $linea = Select-String -Path .env -Pattern '^WEB_PORT=(\d+)' | Select-Object -First 1
    if ($linea) { $Puerto = $linea.Matches[0].Groups[1].Value }
}
if (-not $Puerto) { $Puerto = "3001" }

function Info($m)  { Write-Host "✔ $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "! $m" -ForegroundColor Yellow }
function Fallo($m) { throw $m }

function Invoke-Docker {
    # Ejecuta docker y falla si el comando devuelve error
    & docker @args 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker $($args -join ' ') terminó con código $LASTEXITCODE" }
}

function Test-Requisitos {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Fallo "Docker no está instalado. Instale Docker Desktop: winget install Docker.DockerDesktop (luego reinicie la sesión)."
    }
    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        $desktop = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
        if (-not (Test-Path $desktop)) { Fallo "Docker no está en ejecución. Inicie Docker Desktop y vuelva a intentarlo." }
        Aviso "Iniciando Docker Desktop (puede tardar hasta 2 minutos)..."
        Start-Process $desktop | Out-Null
        $limite = (Get-Date).AddMinutes(3)
        do { Start-Sleep -Seconds 5; docker info *> $null } until ($LASTEXITCODE -eq 0 -or (Get-Date) -gt $limite)
        if ($LASTEXITCODE -ne 0) { Fallo "Docker Desktop no terminó de iniciar. Ábralo manualmente y repita el comando." }
    }
    docker compose version *> $null
    if ($LASTEXITCODE -ne 0) { Fallo "Falta Docker Compose v2. Actualice Docker Desktop." }
}

function Get-IpsLocales {
    # Solo adaptadores con puerta de enlace (la red real del local), no los virtuales
    Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        ForEach-Object { $_.IPv4Address.IPAddress }
}

function Wait-Sano {
    docker compose up -d --wait --wait-timeout 300 *> $null
    if ($LASTEXITCODE -ne 0) {
        docker compose logs --tail 50
        Fallo "Los contenedores no quedaron sanos. Revise los registros de arriba."
    }
}

function Open-Firewall {
    $regla = "SIGER-IA puerto $Puerto"
    if (Get-NetFirewallRule -DisplayName $regla -ErrorAction SilentlyContinue) { return }
    $esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($esAdmin) {
        New-NetFirewallRule -DisplayName $regla -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow -Profile Private, Domain | Out-Null
        Info "Firewall de Windows: puerto $Puerto abierto para la red privada."
    } else {
        Aviso "Para que las tablets entren, abra el puerto una vez en PowerShell como administrador:"
        Write-Host "    New-NetFirewallRule -DisplayName '$regla' -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow -Profile Private,Domain"
    }
}

function Install-Siger {
    Test-Requisitos
    Write-Host "SIGER-IA — instalando con Docker (la primera vez tarda unos minutos)" -ForegroundColor Cyan
    docker compose up -d --build --wait --wait-timeout 300
    if ($LASTEXITCODE -ne 0) {
        docker compose logs --tail 50
        Fallo "Los contenedores no quedaron sanos. Revise los registros de arriba."
    }
    Info "Contenedores en marcha y sanos."
    Open-Firewall
    Write-Host ""
    Write-Host "Abra el sistema en:" -ForegroundColor Cyan
    Write-Host "  • En este equipo:   http://localhost:$Puerto"
    foreach ($ip in Get-IpsLocales) { Write-Host "  • Desde la red:     http://${ip}:$Puerto" }
    Write-Host ""
    Write-Host "Usuario inicial: jefe / admin123  ->  cámbielo en Dashboard > Usuarios."
}

function Show-Estado {
    Test-Requisitos
    docker compose ps
    Write-Host ""
    try {
        (Invoke-WebRequest -UseBasicParsing "http://localhost:$Puerto/api/public/health").Content
    } catch {
        Fallo "El sistema no responde en el puerto $Puerto."
    }
}

function Backup-Siger {
    Test-Requisitos
    $nombre = (docker compose exec -T siger-web node scripts/docker/respaldo.js 2>$null | Select-Object -Last 1)
    if ($LASTEXITCODE -ne 0 -or -not $nombre) { Fallo "No se pudo crear el respaldo." }
    $nombre = $nombre.Trim()
    $remoto = "/data/respaldos/$nombre"
    New-Item -ItemType Directory -Force -Path backups | Out-Null
    Invoke-Docker compose cp "siger-web:$remoto" "backups/$nombre"
    Invoke-Docker compose exec -T siger-web rm -f $remoto
    Info "Respaldo verificado (integrity_check = ok): backups\$nombre"
}

function Restore-Siger($archivo) {
    Test-Requisitos
    if (-not $archivo) { Fallo "Indique el archivo: .\siger.ps1 restaurar backups\siger-AAAAMMDD-HHMMSS-mmm.db" }
    if (-not (Test-Path $archivo)) { Fallo "No existe el archivo: $archivo" }
    # Primero se deja el archivo elegido en el volumen y después se respalda la base actual,
    # así el respaldo de seguridad nunca puede reemplazar al archivo que se va a restaurar.
    Invoke-Docker compose cp $archivo siger-web:/data/restaurar.db
    Aviso "Respaldando la base actual por seguridad antes de restaurar."
    try { Backup-Siger } catch {
        docker compose exec -T siger-web rm -f /data/restaurar.db 2>&1 | Out-Null
        throw "No se restauró nada: falló el respaldo de seguridad. $($_.Exception.Message)"
    }
    Invoke-Docker compose restart
    Wait-Sano
    Info "Base restaurada desde $archivo"
}

function Update-Siger($version) {
    Test-Requisitos
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fallo "Se necesita git para actualizar: winget install Git.Git" }
    Backup-Siger
    git fetch --tags --quiet
    if ($version) { git checkout --quiet $version } else { git pull --ff-only --quiet }
    if ($LASTEXITCODE -ne 0) { Fallo "No se pudo descargar la versión." }
    Info "Código en: $(git describe --tags --always)"
    Install-Siger
}

try {
    switch ($Comando) {
        "instalar"   { Install-Siger }
        "estado"     { Show-Estado }
        "respaldar"  { Backup-Siger }
        "restaurar"  { Restore-Siger $Argumento }
        "actualizar" { Update-Siger $Argumento }
        "logs"       { Test-Requisitos; docker compose logs -f --tail 100 }
        "detener"    { Test-Requisitos; docker compose stop; Info "Detenido. Los datos se conservan. Para iniciar: .\siger.ps1" }
        { $_ -in "ayuda", "-h", "--help" } { Get-Help $PSCommandPath -Detailed }
        default      { Fallo "Comando desconocido: $Comando. Use .\siger.ps1 ayuda" }
    }
} catch {
    Write-Host "✖ $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
