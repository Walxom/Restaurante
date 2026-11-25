#!/bin/sh
set -e

# ==============================================================================
# docker-entrypoint.sh — prepara el volumen /data y arranca el servidor.
# Se ejecuta en cada inicio del contenedor; no requiere configuración previa.
# ==============================================================================

DB_FILE="${DATABASE_URL#file:}"
DB_FILE="${DB_FILE%%\?*}"
DATA_DIR="$(dirname "$DB_FILE")"

# 1. Clave de sesiones. Si no se definió SIGER_SECRET, se genera una aleatoria la
#    primera vez y se guarda en el volumen: así las sesiones sobreviven a reinicios
#    y actualizaciones sin que nadie tenga que crearla a mano.
SECRET_FILE="$DATA_DIR/.nextauth_secret"
if [ -n "$SIGER_SECRET" ]; then
  NEXTAUTH_SECRET="$SIGER_SECRET"
else
  if [ ! -s "$SECRET_FILE" ]; then
    (umask 077 && node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64'))" > "$SECRET_FILE")
    echo "[SIGER-IA] Clave de sesiones generada y guardada en el volumen de datos."
  fi
  NEXTAUTH_SECRET="$(cat "$SECRET_FILE")"
fi
export NEXTAUTH_SECRET
unset SIGER_SECRET

# 2. Restauración: si hay un respaldo en /data/restaurar.db, reemplaza la base actual.
#    Se copia (no se mueve) para que el archivo quede a nombre del usuario del contenedor.
RESTAURAR="$DATA_DIR/restaurar.db"
if [ -f "$RESTAURAR" ]; then
  echo "[SIGER-IA] Restaurando la base desde $RESTAURAR ..."
  rm -f "$DB_FILE" "$DB_FILE-wal" "$DB_FILE-shm"
  cp "$RESTAURAR" "$DB_FILE"
  rm -f "$RESTAURAR"
fi

NUEVA=0
[ -f "$DB_FILE" ] || NUEVA=1

# 3. Esquema de Prisma. Es idempotente: en una base existente solo agrega las
#    columnas o tablas nuevas de la versión instalada, sin borrar datos.
echo "[SIGER-IA] Sincronizando esquema de la base en $DB_FILE ..."
node node_modules/prisma/build/index.js db push --skip-generate

# 4. Datos iniciales solo en una base nueva.
if [ "$NUEVA" = "1" ]; then
  echo "[SIGER-IA] Base nueva: cargando datos iniciales (usuarios, carta y mesas) ..."
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts
  echo "[SIGER-IA] Cambie las contraseñas iniciales en Dashboard > Usuarios."
fi

exec "$@"
