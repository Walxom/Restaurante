@echo off
rem SIGER-IA: lanzador de siger.ps1 sin cambiar la politica de ejecucion de PowerShell.
rem Uso: siger.cmd [instalar^|estado^|respaldar^|restaurar ARCHIVO^|actualizar [vX.Y.Z]^|logs^|detener]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0siger.ps1" %*
if "%~1"=="" pause
