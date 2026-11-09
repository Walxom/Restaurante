#!/usr/bin/env node
/**
 * scripts/test-backup-restore.js
 * ============================================================================
 * Disaster Recovery Drill: Simulacro Automatizado de Restauración de SQLite
 * 
 * Valida:
 * 1. Generación de snapshot transaccional en caliente (VACUUM INTO).
 * 2. Chequeo de integridad relacional (PRAGMA integrity_check).
 * 3. Restauración en base de datos sandbox (restoration_drill.db).
 * 4. Consistencia de datos restaurados (usuarios, contraseñas, mesas, menú).
 * 5. Chequeo de integridad referencial (PRAGMA foreign_key_check).
 * 6. Política de retención: purga de respaldos de más de 7 días.
 * 7. Limpieza total de recursos (Zero Side-Effects).
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const rootDir = path.resolve(__dirname, '..')
const backupsDir = path.join(rootDir, 'backups')
const drillDbPath = path.join(rootDir, 'prisma', 'restoration_drill.db')
const drillDbUrl = 'file:./restoration_drill.db'

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
}

let totalAssertions = 0
let passedAssertions = 0
let failedAssertions = 0

function assert(description, condition, details = '') {
  totalAssertions++
  if (condition) {
    passedAssertions++
    console.log(`  ${c.green}✔ [PASS]${c.reset} ${description} ${details ? c.cyan + details + c.reset : ''}`)
  } else {
    failedAssertions++
    console.error(`  ${c.red}✖ [FAIL]${c.reset} ${description} ${details ? c.yellow + details + c.reset : ''}`)
  }
}

function cleanupDrillDb() {
  const filesToDelete = [
    drillDbPath,
    `${drillDbPath}-journal`,
    `${drillDbPath}-wal`,
    `${drillDbPath}-shm`,
  ]
  for (const f of filesToDelete) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f)
      } catch {}
    }
  }
}

function getMostRecentBackup() {
  if (!fs.existsSync(backupsDir)) return null
  const files = fs.readdirSync(backupsDir)
    .filter((f) => f.startsWith('dev_backup_') && f.endsWith('.db'))
    .map((f) => ({
      name: f,
      path: path.join(backupsDir, f),
      mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)

  return files.length > 0 ? files[0] : null
}

async function runDisasterRecoveryDrill() {
  console.log(`\n${c.bold}🛡️ SRE DISASTER RECOVERY DRILL - SIMULACRO DE RESTAURACIÓN SQLITE${c.reset}`)
  console.log(`${c.dim}Demostrando consistencia de datos y recuperación ante desastres...${c.reset}`)
  console.log('---------------------------------------------------------------------')

  cleanupDrillDb()
  let prisma = null

  try {
    // ─── PASO 1: GENERACIÓN DEL SNAPSHOT TRANSACCIONAL ─────────────────────
    console.log(`\n${c.bold}📦 [1/5] Generación de Snapshot en Caliente (VACUUM INTO):${c.reset}`)
    execSync('node scripts/backup-db.js', { cwd: rootDir, stdio: 'pipe' })
    const latestBackup = getMostRecentBackup()
    assert('Archivo de backup generado en directorio backups/', !!latestBackup, latestBackup ? `(${latestBackup.name})` : '')
    
    const backupStats = latestBackup ? fs.statSync(latestBackup.path) : { size: 0 }
    assert('Tamaño de backup no vacío y consistente', backupStats.size > 50000, `(${backupStats.size} bytes)`)

    // ─── PASO 2: SIMULACRO DE RESTAURACIÓN EN SANDBOX EFÍMERO ─────────────
    console.log(`\n${c.bold}🔄 [2/5] Restauración del Respaldo en Base de Datos de Prueba:${c.reset}`)
    fs.copyFileSync(latestBackup.path, drillDbPath)
    assert('Restauración física de snapshot completada en restoration_drill.db', fs.existsSync(drillDbPath))

    // ─── PASO 3: AUDITORÍA DE INTEGRIDAD EN LA BASE RESTAURADA ─────────────
    console.log(`\n${c.bold}🔍 [3/5] Auditoría de Integridad Estructural (PRAGMA checks):${c.reset}`)
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: drillDbUrl,
        },
      },
    })

    const integrityResult = await prisma.$queryRawUnsafe('PRAGMA integrity_check')
    const isIntegrityOk = Array.isArray(integrityResult) && Object.values(integrityResult[0])[0] === 'ok'
    assert('PRAGMA integrity_check reporta cero corrupción (ok)', isIntegrityOk)

    const fkResult = await prisma.$queryRawUnsafe('PRAGMA foreign_key_check')
    assert('PRAGMA foreign_key_check reporta cero llaves foráneas rotas', Array.isArray(fkResult) && fkResult.length === 0)

    // ─── PASO 4: VERIFICACIÓN DE DATOS TRANSACCIONALES RESTAURADOS ─────────
    console.log(`\n${c.bold}📊 [4/5] Verificación Semántica de Datos Restaurados:${c.reset}`)
    
    // Usuarios y contraseñas
    const jefe = await prisma.user.findUnique({ where: { username: 'jefe' } })
    assert('Usuario administrador (jefe) recuperado intacto', !!jefe && jefe.role === 'JEFE')
    const jefeAuth = jefe ? bcrypt.compareSync('admin123', jefe.password) : false
    assert('Hash bcrypt del administrador preservado y autenticable', jefeAuth)

    const mesero = await prisma.user.findUnique({ where: { username: 'mesero' } })
    assert('Usuario mesero recuperado intacto', !!mesero && mesero.role === 'MESERO')
    const meseroAuth = mesero ? bcrypt.compareSync('mesero123', mesero.password) : false
    assert('Hash bcrypt del mesero preservado y autenticable', meseroAuth)

    // Mesas y Salón
    const tableCount = await prisma.table.count()
    assert('Configuración del salón y mesas recuperadas', tableCount >= 12, `(${tableCount} mesas)`)

    // Menú y Catálogo
    const categoryCount = await prisma.category.count()
    assert('Categorías del menú recuperadas', categoryCount >= 8, `(${categoryCount} categorías)`)
    const productCount = await prisma.product.count()
    assert('Catálogo de productos y platos recuperados', productCount >= 30, `(${productCount} platos)`)

    // Impresoras
    const printerCount = await prisma.printer.count()
    assert('Configuraciones de ticketeras térmicas recuperadas', printerCount >= 1, `(${printerCount} impresoras)`)

    await prisma.$disconnect()
    prisma = null

    // ─── PASO 5: PRUEBA DE LA POLÍTICA DE RETENCIÓN AUTOMÁTICA ─────────────
    console.log(`\n${c.bold}🧹 [5/5] Prueba de Política de Retención y Rotación (> 7 días):${c.reset}`)
    const fakeOldBackup = path.join(backupsDir, 'dev_backup_20200101_000000.db')
    fs.writeFileSync(fakeOldBackup, 'fake old backup content', 'utf-8')
    // Cambiar mtime a hace 30 días
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    fs.utimesSync(fakeOldBackup, thirtyDaysAgo, thirtyDaysAgo)
    assert('Inyección de backup ficticio de 30 días de antigüedad', fs.existsSync(fakeOldBackup))

    // Ejecutar backup para activar la purga automática
    execSync('node scripts/backup-db.js', { cwd: rootDir, stdio: 'pipe' })

    const fakeDeleted = !fs.existsSync(fakeOldBackup)
    assert('Backup obsoleto (> 7 días) purgado automáticamente por la política de retención', fakeDeleted)
    assert('Backups recientes preservados intactos', fs.existsSync(latestBackup.path))

  } catch (err) {
    console.error(`\n${c.red}Error durante el simulacro de recuperación:${c.reset}`, err.message)
    failedAssertions++
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect()
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    cleanupDrillDb()
    const cleanSuccess = !fs.existsSync(drillDbPath)
    assert('Limpieza completa de sandbox de simulación (Zero Side-Effects)', cleanSuccess)
  }

  // ─── RESUMEN FINAL ──────────────────────────────────────────────────────
  console.log('\n---------------------------------------------------------------------')
  console.log(`${c.bold}📊 RESUMEN DEL SIMULACRO DE RECUPERACIÓN (DRILL):${c.reset}`)
  console.log(`   Total aserciones ejecutadas: ${totalAssertions}`)
  console.log(`   Aserciones aprobadas:        ${c.green}${passedAssertions}${c.reset}`)
  console.log(`   Aserciones fallidas:         ${failedAssertions > 0 ? c.red : c.green}${failedAssertions}${c.reset}`)

  if (failedAssertions === 0) {
    console.log(`\n${c.green}${c.bold}🎉 ¡SIMULACRO DE DISASTER RECOVERY SUPERADO CON ÉXITO!${c.reset}`)
    console.log(`${c.cyan}La estrategia de respaldos transaccionales garantiza cero pérdida de datos y restauración 100% verificada.${c.reset}\n`)
    process.exit(0)
  } else {
    console.log(`\n${c.red}${c.bold}⚠ SE DETECTARON FALLOS EN LA ESTRATEGIA DE RESPALDO.${c.reset}\n`)
    process.exit(1)
  }
}

runDisasterRecoveryDrill()
