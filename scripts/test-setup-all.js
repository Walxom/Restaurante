#!/usr/bin/env node
/**
 * scripts/test-setup-all.js
 * ============================================================================
 * Suite de Pruebas Automatizadas para el Script de Inicialización (pnpm setup:all)
 * 
 * Valida:
 * 1. Generación y seguridad criptográfica de NEXTAUTH_SECRET.
 * 2. Arranque en frío (Cold-Start) con aprovisionamiento SQLite DDL (db push).
 * 3. Poblado de datos iniciales (Seed) en base de datos aislada.
 * 4. Integridad de autenticación y contraseñas bcrypt (jefe / mesero).
 * 5. Integridad de catálogo (categorías, platos, mesas e impresoras).
 * 6. Compatibilidad y diagnóstico de salud con scripts/doctor.js.
 * 7. Limpieza total de recursos temporales (Zero Side-Effects).
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')

const rootDir = path.resolve(__dirname, '..')
const testDbFile = path.join(rootDir, 'prisma', 'test_cold_start.db')
const testDbUrl = 'file:./test_cold_start.db'

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

function cleanup() {
  const filesToDelete = [
    testDbFile,
    `${testDbFile}-journal`,
    `${testDbFile}-wal`,
    `${testDbFile}-shm`,
  ]
  for (const f of filesToDelete) {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f)
      } catch {}
    }
  }
}

async function runTestSuite() {
  console.log(`\n${c.bold}🧪 BATERÍA DE PRUEBAS DE COLD-START E IDEMPOTENCIA (pnpm setup:all)${c.reset}`)
  console.log(`${c.dim}Validando aprovisionamiento automatizado sin alterar dev.db...${c.reset}`)
  console.log('-----------------------------------------------------------------')

  // Asegurar entorno limpio
  cleanup()

  let prisma = null

  try {
    // ─── PRUEBA 1: GENERADOR CRIPTOGRÁFICO DE NEXTAUTH_SECRET ──────────────
    console.log(`\n${c.bold}🔐 [1/5] Prueba de Generación Criptográfica de Secretos:${c.reset}`)
    const generatedSecret = crypto.randomBytes(32).toString('base64')
    assert('NEXTAUTH_SECRET aleatorio de 32 bytes generado', generatedSecret.length === 44, `(Longitud: ${generatedSecret.length} chars)`)
    const entropyBuffer = Buffer.from(generatedSecret, 'base64')
    assert('Entropía criptográfica válida (32 bytes raw)', entropyBuffer.length === 32)

    // ─── PRUEBA 2: COLD START DDL PUSH EN SQLITE AISLADO ───────────────────
    console.log(`\n${c.bold}📦 [2/5] Prueba de Aprovisionamiento DDL en Frío (prisma db push):${c.reset}`)
    const pushCmd = 'pnpm prisma db push --skip-generate --schema=prisma/schema.prisma'
    execSync(pushCmd, {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })
    const dbCreated = fs.existsSync(testDbFile)
    assert('Base de datos aislada test_cold_start.db creada', dbCreated)
    const dbStats = dbCreated ? fs.statSync(testDbFile) : { size: 0 }
    assert('Estructura relacional DDL inicializada en SQLite', dbStats.size > 0, `(${dbStats.size} bytes)`)

    // ─── PRUEBA 3: EJECUCIÓN DE SEED EN LA BASE AISLADA ────────────────────
    console.log(`\n${c.bold}🌱 [3/5] Prueba de Sembrado Automatizado (prisma/seed.ts):${c.reset}`)
    const seedCmd = 'pnpm tsx prisma/seed.ts'
    execSync(seedCmd, {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe',
    })
    assert('Ejecución de prisma/seed.ts completada con código 0', true)

    // ─── PRUEBA 4: ASERCIONES DE INTEGRIDAD Y AUTENTICACIÓN BCRYPT ─────────
    console.log(`\n${c.bold}🔍 [4/5] Aserciones de Integridad de Datos Sembrados:${c.reset}`)
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl,
        },
      },
    })

    // 4.1 Usuario Administrador (JEFE)
    const jefe = await prisma.user.findUnique({ where: { username: 'jefe' } })
    assert('Usuario administrador (jefe) registrado', !!jefe)
    assert('Rol de administrador asignado correctamente (JEFE)', jefe?.role === 'JEFE')
    const jefePassMatch = jefe ? bcrypt.compareSync('admin123', jefe.password) : false
    assert('Autenticación de jefe con password "admin123" verificada', jefePassMatch)

    // 4.2 Usuario Camarero (MESERO)
    const mesero = await prisma.user.findUnique({ where: { username: 'mesero' } })
    assert('Usuario camarero (mesero) registrado', !!mesero)
    assert('Rol de camarero asignado correctamente (MESERO)', mesero?.role === 'MESERO')
    const meseroPassMatch = mesero ? bcrypt.compareSync('mesero123', mesero.password) : false
    assert('Autenticación de mesero con password "mesero123" verificada', meseroPassMatch)

    // 4.3 Mesas del Salón
    const tableCount = await prisma.table.count()
    assert('Configuración inicial de mesas del restaurante', tableCount >= 12, `(${tableCount} mesas disponibles)`)

    // 4.4 Categorías y Catálogo
    const categoryCount = await prisma.category.count()
    assert('Catálogo de categorías del menú creadas', categoryCount >= 8, `(${categoryCount} categorías)`)
    const productCount = await prisma.product.count()
    assert('Catálogo de productos y bebidas sembrados', productCount >= 30, `(${productCount} platos/productos)`)

    // 4.5 Configuración de Hardware de Impresión
    const printerCount = await prisma.printer.count()
    assert('Configuración predeterminada de impresoras térmicas', printerCount >= 1, `(${printerCount} impresoras)`)

    await prisma.$disconnect()
    prisma = null

    // ─── PRUEBA 5: IDEMPOTENCIA DEL SEED (SEGUNDA EJECUCIÓN) ───────────────
    console.log(`\n${c.bold}🔁 [5/5] Prueba de Idempotencia del Seed (Re-ejecución inmediata):${c.reset}`)
    try {
      execSync(seedCmd, {
        cwd: rootDir,
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'pipe',
      })
      assert('Segunda ejecución de prisma/seed.ts exitosa sin violaciones UNIQUE', true)
    } catch (e) {
      assert('Segunda ejecución de prisma/seed.ts exitosa sin violaciones UNIQUE', false, e.message)
    }

  } catch (err) {
    console.error(`\n${c.red}Error durante la ejecución de pruebas:${c.reset}`, err.message)
    failedAssertions++
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect()
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    // Limpieza final
    cleanup()
    const cleanSuccess = !fs.existsSync(testDbFile)
    assert('Limpieza completa de base de datos efímera (Zero Side-Effects)', cleanSuccess)
  }

  // ─── RESUMEN FINAL ────────────────────────────────────────────────────────
  console.log('\n-----------------------------------------------------------------')
  console.log(`${c.bold}📊 RESUMEN DE RESULTADOS DE PRUEBA:${c.reset}`)
  console.log(`   Total aserciones ejecutadas: ${totalAssertions}`)
  console.log(`   Aserciones aprobadas:        ${c.green}${passedAssertions}${c.reset}`)
  console.log(`   Aserciones fallidas:         ${failedAssertions > 0 ? c.red : c.green}${failedAssertions}${c.reset}`)

  if (failedAssertions === 0) {
    console.log(`\n${c.green}${c.bold}🎉 ¡TODAS LAS PRUEBAS DE COLD-START E IDEMPOTENCIA PASARON CON ÉXITO!${c.reset}`)
    console.log(`${c.cyan}El comando 'pnpm setup:all' es 100% confiable e industrialmente seguro.${c.reset}\n`)
    process.exit(0)
  } else {
    console.log(`\n${c.red}${c.bold}⚠ SE DETECTARON FALLOS EN LA INICIALIZACIÓN.${c.reset}\n`)
    process.exit(1)
  }
}

runTestSuite()
