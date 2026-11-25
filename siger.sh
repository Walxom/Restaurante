#!/usr/bin/env bash
# ==============================================================================
# SIGER-IA — despliegue y operación con Docker en Linux (y macOS).
#
#   ./siger.sh                     instala o actualiza los contenedores y los deja en marcha
#   ./siger.sh estado              estado de los contenedores y salud del sistema
#   ./siger.sh respaldar           copia consistente de la base en ./backups/
#   ./siger.sh restaurar ARCHIVO   reemplaza la base por un respaldo (antes respalda la actual)
#   ./siger.sh actualizar [vX.Y.Z] respalda, descarga la versión indicada (o la última) y reinstala
#   ./siger.sh logs                registros en vivo (Ctrl+C para salir)
#   ./siger.sh detener             detiene los contenedores sin borrar datos
# ==============================================================================
set -euo pipefail
cd "$(dirname "$0")"

PUERTO="${WEB_PORT:-$(grep -s '^WEB_PORT=' .env | cut -d= -f2 || true)}"
PUERTO="${PUERTO:-3001}"
VERDE=$'\e[32m'; AMARILLO=$'\e[33m'; ROJO=$'\e[31m'; NEGRITA=$'\e[1m'; NORMAL=$'\e[0m'

info()  { echo "${VERDE}✔${NORMAL} $*"; }
aviso() { echo "${AMARILLO}!${NORMAL} $*"; }
error() { echo "${ROJO}✖ $*${NORMAL}" >&2; exit 1; }

requisitos() {
  command -v docker >/dev/null 2>&1 || error "Docker no está instalado. Instálelo con: curl -fsSL https://get.docker.com | sh"
  docker info >/dev/null 2>&1 || error "Docker no está en ejecución o su usuario no tiene permiso. Pruebe: sudo systemctl start docker  (y agregue su usuario al grupo docker)"
  docker compose version >/dev/null 2>&1 || error "Falta el plugin Docker Compose v2 (paquete docker-compose-plugin)."
}

ips_locales() {
  if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
    hostname -I | tr ' ' '\n' | grep -E '^[0-9]+\.' | grep -vE '^(127\.|172\.(1[7-9]|2[0-9]|3[01])\.)' || true
  elif command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || true
  fi
}

esperar_sano() {
  docker compose up -d --wait --wait-timeout 300 >/dev/null || {
    docker compose logs --tail 50
    error "Los contenedores no quedaron sanos. Revise los registros de arriba."
  }
}

instalar() {
  requisitos
  echo "${NEGRITA}SIGER-IA — instalando con Docker${NORMAL} (la primera vez tarda unos minutos)"
  docker compose up -d --build --wait --wait-timeout 300 || {
    docker compose logs --tail 50
    error "Los contenedores no quedaron sanos. Revise los registros de arriba."
  }
  info "Contenedores en marcha y sanos."
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    aviso "El firewall ufw está activo. Para que las tablets entren: sudo ufw allow ${PUERTO}/tcp"
  fi
  echo
  echo "${NEGRITA}Abra el sistema en:${NORMAL}"
  echo "  • En este equipo:   http://localhost:${PUERTO}"
  for ip in $(ips_locales); do echo "  • Desde la red:     http://${ip}:${PUERTO}"; done
  echo
  echo "Usuario inicial: jefe / admin123  →  cámbielo en Dashboard > Usuarios."
}

estado() {
  requisitos
  docker compose ps
  echo
  curl -fsS "http://localhost:${PUERTO}/api/public/health" && echo || error "El sistema no responde en el puerto ${PUERTO}."
}

respaldar() {
  requisitos
  local remoto nombre
  nombre="$(docker compose exec -T siger-web node scripts/docker/respaldo.js | tail -n 1 | tr -d '\r')"
  [[ -n "$nombre" ]] || error "No se pudo crear el respaldo."
  remoto="/data/respaldos/${nombre}"
  mkdir -p backups
  docker compose cp "siger-web:${remoto}" "backups/${nombre}" >/dev/null
  docker compose exec -T siger-web rm -f "$remoto"
  info "Respaldo verificado (integrity_check = ok): backups/${nombre}"
}

restaurar() {
  requisitos
  local archivo="${1:-}"
  [[ -n "$archivo" ]] || error "Indique el archivo: ./siger.sh restaurar backups/siger-AAAAMMDD-HHMMSS.db"
  [[ -f "$archivo" ]] || error "No existe el archivo: $archivo"
  aviso "Primero se respalda la base actual por seguridad."
  respaldar
  docker compose cp "$archivo" siger-web:/data/restaurar.db >/dev/null
  docker compose restart >/dev/null
  esperar_sano
  info "Base restaurada desde $archivo"
}

actualizar() {
  requisitos
  command -v git >/dev/null 2>&1 || error "Se necesita git para actualizar."
  respaldar
  git fetch --tags --quiet
  if [[ -n "${1:-}" ]]; then git checkout --quiet "$1"; else git pull --ff-only --quiet; fi
  info "Código en: $(git describe --tags --always)"
  instalar
}

case "${1:-instalar}" in
  instalar)   instalar ;;
  estado)     estado ;;
  respaldar)  respaldar ;;
  restaurar)  restaurar "${2:-}" ;;
  actualizar) actualizar "${2:-}" ;;
  logs)       requisitos; docker compose logs -f --tail 100 ;;
  detener)    requisitos; docker compose stop; info "Detenido. Los datos se conservan. Para iniciar: ./siger.sh" ;;
  -h|--help|ayuda) sed -n '2,13p' "$0" ;;
  *) error "Comando desconocido: $1. Use ./siger.sh ayuda" ;;
esac
