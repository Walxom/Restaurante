#!/usr/bin/env node
/**
 * Respaldo en caliente de la base SQLite dentro del contenedor siger-web.
 * Lo invocan siger.sh / siger.ps1 con: docker compose exec -T siger-web node scripts/docker/respaldo.js
 *
 * 1. VACUUM INTO: copia consistente aunque el sistema esté en uso (modo WAL).
 * 2. PRAGMA integrity_check sobre la copia.
 * 3. Imprime la ruta de la copia en la última línea (la usa el script del host).
 */
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const dbFile = (process.env.DATABASE_URL || 'file:/data/prod.db').replace(/^file:/, '').split('?')[0]
// Carpeta fija dentro del volumen de datos del contenedor
const carpeta = '/data/respaldos'
// AAAAMMDD-HHMMSS-mmm: con milisegundos para que dos respaldos seguidos no se pisen
const sello = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').replace('.', '-').slice(0, 19)
const destino = path.join(carpeta, `siger-${sello}.db`)

async function main() {
  fs.mkdirSync(carpeta, { recursive: true })
  const origen = new PrismaClient({ datasourceUrl: `file:${dbFile}` })
  try {
    await origen.$executeRawUnsafe(`VACUUM INTO '${destino.replace(/'/g, "''")}'`)
  } finally {
    await origen.$disconnect()
  }

  const copia = new PrismaClient({ datasourceUrl: `file:${destino}` })
  try {
    const [{ integrity_check: estado }] = await copia.$queryRawUnsafe('PRAGMA integrity_check')
    if (estado !== 'ok') throw new Error(`integrity_check = ${estado}`)
  } finally {
    await copia.$disconnect()
  }
  // Solo el nombre del archivo; el script del host arma la ruta /data/respaldos/<nombre>
  console.log(path.basename(destino))
}

main().catch((err) => {
  console.error(`Respaldo fallido: ${err.message}`)
  fs.rmSync(destino, { force: true })
  process.exit(1)
})
