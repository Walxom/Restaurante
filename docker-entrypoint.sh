#!/bin/sh
set -e

# ==============================================================================
# docker-entrypoint.sh: Inicialización segura de SQLite en contenedor
# ==============================================================================

# Si la base de datos SQLite especificada no existe, inicializar esquema y seed
DB_FILE="/data/prod.db"
if [ ! -f "$DB_FILE" ]; then
  echo "📦 [SIGER-IA] Base de datos no encontrada en $DB_FILE. Aprovisionando tablas..."
  pnpm prisma db push --skip-generate || true
  pnpm tsx prisma/seed.ts || true
  echo "✔ [SIGER-IA] Base de datos inicializada exitosamente."
fi

exec "$@"
