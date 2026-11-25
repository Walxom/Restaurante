#!/usr/bin/env node
/**
 * scripts/test-power-loss.js
 * ============================================================================
 * Simulacro de caída abrupta del servidor durante escrituras (SQLite + WAL).
 *
 * Simula lo que pasa si se va la luz o se cuelga la PC mientras se registran
 * ventas: un proceso hijo escribe transacciones sin parar y se le mata de golpe
 * (SIGKILL / TerminateProcess), sin cierre ordenado. Se repite varias veces y
 * después de cada caída se comprueba que:
 *   1. La base de datos no está corrupta (PRAGMA integrity_check = ok).
 *   2. Ninguna transacción confirmada se perdió (filas >= confirmaciones).
 *   3. No quedó ninguna transacción a medias (cada venta tiene su detalle).
 *
 * Usa una base temporal: no toca prisma/dev.db.
 * Límite: mata el proceso, no apaga el sistema operativo. Un corte de luz real
 * también vacía la caché del disco; para eso SQLite usa synchronous=FULL.
 * ============================================================================
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const CICLOS = Number(process.env.POWER_LOSS_CYCLES || 5)
// El hijo recibe la ruta por entorno: su PID es distinto al del padre.
const DB = process.env.POWER_LOSS_DB || path.join(os.tmpdir(), `siger-power-loss-${process.pid}.db`)
const archivosDb = () => [DB, `${DB}-wal`, `${DB}-shm`, `${DB}-journal`]

// --- Proceso hijo: escribe ventas hasta que lo maten -------------------------
if (process.argv[2] === '--writer') {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient({ datasourceUrl: `file:${DB}?connection_limit=1` })
  ;(async () => {
    // Mismos PRAGMA que src/lib/prisma.ts
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL')
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000')
    await prisma.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS venta (id INTEGER PRIMARY KEY, total REAL NOT NULL)'
    )
    await prisma.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS venta_item (venta_id INTEGER NOT NULL REFERENCES venta(id), cantidad INTEGER NOT NULL)'
    )
    // Tope de seguridad: si el padre muere sin matarlo, el hijo termina solo.
    const limite = Date.now() + 60_000
    while (Date.now() < limite) {
      // Venta + detalle en una sola transacción: o se guardan las dos o ninguna.
      await prisma.$transaction(async (tx) => {
        const [{ id }] = await tx.$queryRawUnsafe(
          'INSERT INTO venta (total) VALUES (25.5) RETURNING id'
        )
        await tx.$executeRawUnsafe('INSERT INTO venta_item (venta_id, cantidad) VALUES (?, 2)', id)
      })
      process.stdout.write('ACK\n') // solo tras el commit
    }
    await prisma.$disconnect()
  })().catch((e) => {
    console.error(e)
    process.exit(1)
  })
  return
}

// --- Proceso padre: lanza, mata y verifica -----------------------------------
const c = { verde: '\x1b[32m', rojo: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' }

function ejecutarCiclo(numero) {
  return new Promise((resolve, reject) => {
    const hijo = spawn(process.execPath, [__filename, '--writer'], {
      env: { ...process.env, POWER_LOSS_DB: DB },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let confirmadas = 0
    let error = ''
    const espera = 300 + Math.floor(Math.random() * 1200)
    let temporizador = null
    hijo.stdout.on('data', (d) => {
      confirmadas += (d.toString().match(/ACK/g) || []).length
      // El reloj de la caída arranca con la primera venta confirmada,
      // para que el corte ocurra siempre en plena escritura.
      if (!temporizador && confirmadas > 0) {
        temporizador = setTimeout(() => hijo.kill('SIGKILL'), espera)
      }
    })
    hijo.stderr.on('data', (d) => (error += d.toString()))
    hijo.on('exit', (code, signal) => {
      clearTimeout(temporizador)
      if (signal !== 'SIGKILL' && code !== null && code !== 0) {
        return reject(new Error(`El escritor falló antes de la caída (ciclo ${numero}): ${error}`))
      }
      resolve(confirmadas)
    })
  })
}

async function verificar(confirmadasTotales) {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient({ datasourceUrl: `file:${DB}?connection_limit=1` })
  try {
    const [{ integrity_check: integridad }] = await prisma.$queryRawUnsafe('PRAGMA integrity_check')
    const [{ n: ventas }] = await prisma.$queryRawUnsafe('SELECT count(*) AS n FROM venta')
    const [{ n: huerfanas }] = await prisma.$queryRawUnsafe(
      'SELECT count(*) AS n FROM venta v WHERE NOT EXISTS (SELECT 1 FROM venta_item i WHERE i.venta_id = v.id)'
    )
    const [{ journal_mode: modo }] = await prisma.$queryRawUnsafe('PRAGMA journal_mode')
    return { integridad, ventas: Number(ventas), huerfanas: Number(huerfanas), modo, confirmadasTotales }
  } finally {
    await prisma.$disconnect()
  }
}

;(async () => {
  archivosDb().forEach((f) => fs.rmSync(f, { force: true }))
  console.log(`\nSimulacro de caída abrupta — ${CICLOS} ciclos ${c.dim}(${DB})${c.reset}\n`)
  let total = 0
  let fallos = 0
  try {
    for (let i = 1; i <= CICLOS; i++) {
      total += await ejecutarCiclo(i)
      const r = await verificar(total)
      const ok = r.integridad === 'ok' && r.ventas >= total && r.huerfanas === 0
      if (!ok) fallos++
      console.log(
        `  ${ok ? c.verde + '✔' : c.rojo + '✘'}${c.reset} Ciclo ${i}: integridad=${r.integridad}, ` +
          `ventas=${r.ventas}, confirmadas=${total}, sin detalle=${r.huerfanas}, modo=${r.modo}`
      )
    }
  } finally {
    archivosDb().forEach((f) => fs.rmSync(f, { force: true }))
  }
  if (fallos > 0) {
    console.error(`\n${c.rojo}✘ ${fallos} ciclo(s) con pérdida o corrupción de datos.${c.reset}\n`)
    process.exit(1)
  }
  console.log(`\n${c.verde}✔ Sin corrupción ni pérdida de ventas confirmadas en ${CICLOS} caídas.${c.reset}\n`)
})().catch((e) => {
  console.error(e)
  archivosDb().forEach((f) => fs.rmSync(f, { force: true }))
  process.exit(1)
})
