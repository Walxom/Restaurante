#!/usr/bin/env node
/**
 * scripts/backup-db.js
 * ============================================================================
 * Respaldo Transaccional Seguro de SQLite para SIGER-IA (Local-First SRE).
 * 
 * Implementa:
 * 1. Snapshot transaccional en caliente mediante 'VACUUM INTO' (Cero corrupción en WAL).
 * 2. Chequeo de integridad relacional (PRAGMA integrity_check).
 * 3. Política de retención automática (Purga de backups de más de 7 días).
 * 4. Copia secundaria a almacenamiento externo/USB opcional.
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const rootDir = path.resolve(__dirname, '..')
const backupsDir = path.join(rootDir, 'backups')
const RETENTION_DAYS = 7

// Parsear argumento opcional --extra <directorio>
const extraIndex = process.argv.indexOf('--extra')
const extraDestination = extraIndex !== -1 && process.argv[extraIndex + 1] ? process.argv[extraIndex + 1] : null

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
}

function getFormattedTimestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const hh = pad(now.getHours())
  const min = pad(now.getMinutes())
  const ss = pad(now.getSeconds())
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`
}

function purgeOldBackups() {
  try {
    const files = fs.readdirSync(backupsDir)
    const now = Date.now()
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000
    let purgedCount = 0

    for (const file of files) {
      if (file.startsWith('dev_backup_') && file.endsWith('.db')) {
        const filePath = path.join(backupsDir, file)
        const stats = fs.statSync(filePath)
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath)
          purgedCount++
        }
      }
    }
    if (purgedCount > 0) {
      console.log(`  ${c.cyan}ℹ Política de retención:${c.reset} Se purgaron ${purgedCount} backups antiguos (> ${RETENTION_DAYS} días).`)
    }
  } catch (err) {
    console.warn(`  ${c.yellow}⚠ Advertencia al rotar respaldos antiguos:${c.reset}`, err.message)
  }
}

async function runBackup() {
  console.log(`\n${c.bold}📦 SIGER-IA - Respaldo Transaccional Seguro de Base de Datos SQLite${c.reset}`)
  console.log('---------------------------------------------------------------------')

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }

  let timestamp = getFormattedTimestamp()
  let backupFileName = `dev_backup_${timestamp}.db`
  let localBackupPath = path.join(backupsDir, backupFileName)
  let collisionCounter = 1
  while (fs.existsSync(localBackupPath)) {
    backupFileName = `dev_backup_${timestamp}_${collisionCounter++}.db`
    localBackupPath = path.join(backupsDir, backupFileName)
  }
  const normalizedSqlPath = localBackupPath.replace(/\\/g, '/')

  console.log(`  Origen:   ${c.dim}Base de datos activa (SQLite WAL)${c.reset}`)
  console.log(`  Destino:  ${c.dim}${localBackupPath}${c.reset}`)

  const prisma = new PrismaClient()

  try {
    // 1. Ejecutar VACUUM INTO transaccional (seguro en concurrencia)
    console.log(`\n  ${c.bold}⚙ Ejecutando snapshot atómico (VACUUM INTO)...${c.reset}`)
    await prisma.$executeRawUnsafe(`VACUUM INTO '${normalizedSqlPath}'`)

    if (!fs.existsSync(localBackupPath)) {
      throw new Error(`El archivo de respaldo no fue generado en: ${localBackupPath}`)
    }

    const stats = fs.statSync(localBackupPath)
    const sizeKb = (stats.size / 1024).toFixed(2)
    console.log(`  ${c.green}✔ Respaldo transaccional generado exitosamente:${c.reset} ${backupFileName} (${sizeKb} KB)`)

    // 2. Verificación de Integridad Relacional
    console.log(`  ${c.bold}⚙ Verificando integridad de la copia (PRAGMA integrity_check)...${c.reset}`)
    const verifyPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${normalizedSqlPath}`,
        },
      },
    })
    const checkResult = await verifyPrisma.$queryRawUnsafe('PRAGMA integrity_check')
    await verifyPrisma.$disconnect()

    const isHealthy = Array.isArray(checkResult) && checkResult.length > 0 && Object.values(checkResult[0])[0] === 'ok'
    if (isHealthy) {
      console.log(`  ${c.green}✔ Integridad de base de datos verificada: OK (Cero corrupción).${c.reset}`)
    } else {
      console.warn(`  ${c.yellow}⚠ Resultado de verificación de integridad inesperado:${c.reset}`, JSON.stringify(checkResult))
    }

    // 3. Copia secundaria opcional (USB / Disco Externo)
    if (extraDestination) {
      console.log(`\n  ${c.bold}💾 Copiando a almacenamiento secundario/USB...${c.reset}`)
      if (!fs.existsSync(extraDestination)) {
        fs.mkdirSync(extraDestination, { recursive: true })
      }
      const extraFilePath = path.join(extraDestination, backupFileName)
      fs.copyFileSync(localBackupPath, extraFilePath)
      console.log(`  ${c.green}✔ Copia secundaria guardada en:${c.reset} ${extraFilePath}`)
    }

    // 4. Aplicar política de retención
    purgeOldBackups()

    console.log(`\n${c.green}${c.bold}🎉 Proceso de respaldo SRE finalizado correctamente.${c.reset}\n`)
    process.exit(0)
  } catch (err) {
    console.error(`\n${c.red}✖ Error crítico durante el respaldo de base de datos:${c.reset}`, err.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runBackup().catch((err) => {
  console.error(err)
  process.exit(1)
})
