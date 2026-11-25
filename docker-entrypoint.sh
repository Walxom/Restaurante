#!/bin/sh
set -e

# ==============================================================================
# docker-entrypoint.sh — prepara la base SQLite del volumen /data y arranca el
# servidor. Se ejecuta en cada inicio del contenedor.
# ==============================================================================

DB_FILE="${DATABASE_URL#file:}"
DB_FILE="${DB_FILE%%\?*}"

# Restauración: si hay un respaldo en /data/restaurar.db, reemplaza la base actual.
# Se copia (no se mueve) para que el archivo quede a nombre del usuario del contenedor.
RESTAURAR="$(dirname "$DB_FILE")/restaurar.db"
if [ -f "$RESTAURAR" ]; then
  echo "[SIGER-IA] Restaurando la base desde $RESTAURAR ..."
  rm -f "$DB_FILE" "$DB_FILE-wal" "$DB_FILE-shm"
  cp "$RESTAURAR" "$DB_FILE"
  rm -f "$RESTAURAR"
fi

NUEVA=0
[ -f "$DB_FILE" ] || NUEVA=1

# Aplica el esquema de Prisma. Es idempotente: en una base existente solo agrega
# las columnas o tablas nuevas de la versión instalada, sin borrar datos.
echo "[SIGER-IA] Sincronizando esquema de la base en $DB_FILE ..."
node node_modules/prisma/build/index.js db push --skip-generate

if [ "$NUEVA" = "1" ]; then
  echo "[SIGER-IA] Base nueva: cargando datos iniciales (usuarios, carta y mesas) ..."
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts
  echo "[SIGER-IA] Cambie las contraseñas iniciales en Dashboard > Usuarios."
fi

exec "$@"
