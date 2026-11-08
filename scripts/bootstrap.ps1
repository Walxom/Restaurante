<#
.SYNOPSIS
    Bootstrap y aprovisionamiento determinista de SIGER-IA para Windows.
.DESCRIPTION
    Script nativo de entrada previa a Node.js. Verifica e instala prerrequisitos
    del sistema (Node.js LTS, pnpm, uv para Python 3.10) y orquesta el montaje completo.
#>

[CmdletBinding()]
param(
    [switch]$SkipAiSetup,
    [switch]$Help
)

$ErrorActionPreference = "Continue"

function Write-Step($num, $msg) {
    Write-Host "`n[$num/4] $msg" -ForegroundColor Cyan -NoNewline
    Write-Host "..." -ForegroundColor DarkGray
}

function Write-Success($msg) {
    Write-Host "  ✔ $msg" -ForegroundColor Green
}

function Write-WarnMsg($msg) {
    Write-Host "  ⚠ $msg" -ForegroundColor Yellow
}

function Write-Fail($msg) {
    Write-Host "  ✖ $msg" -ForegroundColor Red
}

Write-Host @"

=================================================================
       SIGER-IA - BOOTSTRAP DETERMINISTA DE SISTEMA
   Verificación e Instalación Automática de Prerrequisitos
=================================================================
"@ -ForegroundColor Cyan

# ─── 1. VERIFICAR NODE.JS ──────────────────────────────────────────────────────
Write-Step 1 "Verificando Runtime de Node.js"

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if ($nodeCmd) {
    $nodeVersion = node -v
    $major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($major -ge 20) {
        Write-Success "Node.js $nodeVersion detectado (compatible)."
    } else {
        Write-WarnMsg "Node.js $nodeVersion detectado. Se recomienda Node.js v20.10+ LTS."
    }
} else {
    Write-Fail "Node.js no está instalado en el sistema."
    Write-Host "`n¿Deseas instalar Node.js LTS automáticamente mediante Windows Package Manager (winget)?" -ForegroundColor Yellow
    $install = Read-Host "[S/N]"
    if ($install -match '^[sSyY]') {
        Write-Host "⏳ Instalando Node.js LTS mediante winget..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        # Refrescar variables de entorno en la sesión actual
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        if (Get-Command node -ErrorAction SilentlyContinue) {
            Write-Success "Node.js instalado exitosamente: $(node -v)"
        } else {
            Write-Fail "Instalación completada pero se requiere reiniciar esta terminal de PowerShell."
            exit 1
        }
    } else {
        Write-Host "Descarga e instala Node.js manualmente desde: https://nodejs.org" -ForegroundColor Cyan
        exit 1
    }
}

# ─── 2. VERIFICAR PNPM ─────────────────────────────────────────────────────────
Write-Step 2 "Verificando Gestor de Paquetes pnpm"

$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue

if ($pnpmCmd) {
    $pnpmVer = pnpm -v
    Write-Success "pnpm v$pnpmVer detectado."
} else {
    Write-WarnMsg "pnpm no encontrado. Intentando activar vía Corepack o npm global..."
    try {
        corepack enable
        corepack prepare pnpm@latest --activate
        Write-Success "pnpm activado mediante Corepack."
    } catch {
        Write-Host "⏳ Instalando pnpm globalmente con npm..." -ForegroundColor Cyan
        npm install -g pnpm
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            Write-Success "pnpm instalado exitosamente: $(pnpm -v)"
        } else {
            Write-Fail "No se pudo activar pnpm automáticamente. Ejecuta: npm install -g pnpm"
            exit 1
        }
    }
}

# ─── 3. VERIFICAR UV / PYTHON (PARA EL MOTOR DE IA) ───────────────────────────
Write-Step 3 "Verificando Entorno de Inteligencia Artificial (uv / Python 3.10)"

$uvCmd = Get-Command uv -ErrorAction SilentlyContinue

if ($uvCmd) {
    $uvVer = uv --version
    Write-Success "$uvVer detectado (entorno de ejecución optimizado)."
} else {
    Write-WarnMsg "'uv' (Astral) no está instalado. Instalándolo en 2 segundos para auto-gestionar Python 3.10..."
    try {
        powershell -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User") + ";$HOME\.local\bin;$HOME\.cargo\bin"
        if (Get-Command uv -ErrorAction SilentlyContinue) {
            Write-Success "'uv' instalado exitosamente: $(uv --version)"
        } else {
            Write-WarnMsg "No se pudo detectar 'uv' en PATH inmediato. setup-system.js evaluará el Python nativo."
        }
    } catch {
        Write-WarnMsg "Descarga de 'uv' no completada. Se usará el Python del sistema si existe."
    }
}

# ─── 4. ORQUESTAR MONTAJE COMPLETO (SETUP-SYSTEM.JS) ──────────────────────────
Write-Step 4 "Iniciando Aprovisionamiento Integral de Aplicación y Datos"

node scripts/setup-system.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎉 ¡SIGER-IA montado y validado exitosamente!" -ForegroundColor Green
    Write-Host "Comando para iniciar el sistema: " -NoNewline
    Write-Host "pnpm dev:ai" -ForegroundColor Yellow
} else {
    Write-Fail "El montaje reportó observaciones. Revisa los mensajes anteriores."
    exit $LASTEXITCODE
}
