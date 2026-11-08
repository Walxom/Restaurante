<#
.SYNOPSIS
    Script de montaje automatizado Turnkey para SIGER-IA (Windows PowerShell).
.DESCRIPTION
    Alias de compatibilidad retroactiva que invoca el bootstrap integral de prerrequisitos.
#>

[CmdletBinding()]
param()

$bootstrapPath = Join-Path $PSScriptRoot "bootstrap.ps1"
if (Test-Path $bootstrapPath) {
    & $bootstrapPath @args
} else {
    node scripts/setup-system.js
}
