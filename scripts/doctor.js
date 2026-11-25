#!/usr/bin/env node
/**
 * scripts/doctor.js
 * ============================================================================
 * Herramienta de diagnóstico avanzado de salud del sistema SIGER-IA.
 * Verifica la integridad del entorno, colisión de puertos, base de datos SQLite,
 * configuración de NextAuth y estado del runtime de Inteligencia Artificial.
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')
const net = require('net')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')

// Colores ANSI
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
}

const check = (desc, ok, detail = '') => {
  if (ok) {
    console.log(`  ${c.green}✔${c.reset} ${desc} ${detail ? c.cyan + detail + c.reset : ''}`)
    return true
  } else {
    console.log(`  ${c.red}✖${c.reset} ${desc} ${detail ? c.yellow + detail + c.reset : ''}`)
    return false
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false)
      } else {
        resolve(true)
      }
    })
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '0.0.0.0')
  })
}

async function runDoctor() {
  console.log(`\n${c.bold}🩺 Diagnóstico de Salud del Sistema (SIGER-IA Doctor)${c.reset}`)
  console.log('---------------------------------------------------------')

  let hasErrors = false

  // ─── 1. ARCHIVO DE ENTORNO (.ENV) ──────────────────────────────────────────
  console.log(`\n${c.bold}🔑 1. Configuración y Credenciales (.env):${c.reset}`)
  const envPath = path.join(rootDir, '.env')
  const envExists = fs.existsSync(envPath)
  if (!check('Archivo de variables (.env)', envExists, envExists ? '(presente)' : '(FALTA: ejecuta pnpm setup:all)')) {
    hasErrors = true
  }

  // Cargar .env en memoria
  if (envExists && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath)
    } catch {}
  }

  const secret = process.env.NEXTAUTH_SECRET
  const dbUrl = process.env.DATABASE_URL
  const webPort = parseInt(process.env.PORT || '3001', 10)
  const aiPort = Number(process.env.AI_PORT) || 8000

  if (!check('NEXTAUTH_SECRET configurado', !!secret && secret.length >= 16, secret ? '(longitud suficiente)' : '(FALTA o es inseguro)')) {
    hasErrors = true
  }

  if (!check('DATABASE_URL configurada', !!dbUrl, dbUrl ? '(configurada)' : '(FALTA)')) {
    hasErrors = true
  }

  // ─── 2. DETECCIÓN DE CONFLICTOS DE PUERTOS ─────────────────────────────────
  console.log(`\n${c.bold}🌐 2. Disponibilidad de Puertos de Red:${c.reset}`)
  const webPortFree = await isPortAvailable(webPort)
  if (webPortFree) {
    check(`Puerto web :${webPort} (Next.js / Sockets)`, true, '(disponible para arrancar)')
  } else {
    check(`Puerto web :${webPort} (Next.js / Sockets)`, true, `(en uso - posible servidor ya en ejecución)`)
  }

  // El motor de IA elige solo un puerto libre (src/lib/ai-engine.ts), así que un
  // puerto ocupado por otra aplicación no es un error: solo se informa.
  let aiPortActual = aiPort
  try {
    aiPortActual = Number.parseInt(fs.readFileSync(path.join(process.cwd(), 'logs', 'ai-engine.port'), 'utf-8'), 10) || aiPort
  } catch {
    // Sin archivo: el motor aún no se ha iniciado en este equipo
  }
  let esMotorSiger = false
  try {
    const res = await fetch(`http://127.0.0.1:${aiPortActual}/health`, { signal: AbortSignal.timeout(1500) })
    const data = await res.json()
    esMotorSiger = data?.service === 'ai-engine'
  } catch {
    // No responde
  }
  if (esMotorSiger) {
    check(`Motor de IA (Python FastAPI)`, true, `(en ejecución en 127.0.0.1:${aiPortActual})`)
  } else if (await isPortAvailable(aiPort)) {
    check(`Puerto IA :${aiPort} (Python FastAPI)`, true, '(disponible para arrancar)')
  } else {
    check(`Puerto IA :${aiPort} (Python FastAPI)`, true, '(ocupado por otra aplicación: el motor usará el siguiente puerto libre automáticamente)')
  }

  // ─── 3. CONECTIVIDAD Y DATOS (SQLITE / PRISMA) ─────────────────────────────
  console.log(`\n${c.bold}📦 3. Base de Datos Relacional (SQLite / Prisma):${c.reset}`)
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient({
      datasourceUrl: dbUrl || 'file:./dev.db',
      log: ['error'],
    })

    const userCount = await prisma.user.count()
    check('Conexión con SQLite exitosa', true)

    if (!check('Usuarios del sistema inicializados', userCount > 0, `(${userCount} usuarios registrados)`)) {
      hasErrors = true
      console.log(`    ${c.yellow}→ Tip: Ejecuta 'pnpm db:seed' para crear los usuarios jefe y mesero.${c.reset}`)
    }

    const productCount = await prisma.product.count()
    check('Catálogo de productos disponible', productCount > 0, `(${productCount} platos/bebidas)`)

    const tableCount = await prisma.table.count()
    check('Mesas de salón configuradas', tableCount > 0, `(${tableCount} mesas)`)

    await prisma.$disconnect()
  } catch (err) {
    check('Conectividad con Prisma/SQLite', false, `(Error: ${err.message})`)
    hasErrors = true
  }

  // ─── 4. RUNTIME DE INTELIGENCIA ARTIFICIAL (PYTHON) ────────────────────────
  console.log(`\n${c.bold}🧠 4. Microservicio de Inteligencia Artificial (FastAPI):${c.reset}`)
  const isWin = process.platform === 'win32'
  const venvPython = path.join(
    rootDir,
    'ai_engine',
    'venv',
    isWin ? 'Scripts' : 'bin',
    isWin ? 'python.exe' : 'python'
  )
  const venvUvicorn = path.join(
    rootDir,
    'ai_engine',
    'venv',
    isWin ? 'Scripts' : 'bin',
    isWin ? 'uvicorn.exe' : 'uvicorn'
  )

  const venvExists = fs.existsSync(venvPython) && fs.existsSync(venvUvicorn)
  if (venvExists) {
    let pyVersion = 'Python 3.10'
    try {
      pyVersion = execSync(`"${venvPython}" --version`, { encoding: 'utf-8' }).trim()
    } catch {}
    check('Entorno virtual de Python (venv)', true, `(Listo con ${pyVersion} y Uvicorn)`)
  } else {
    check(
      'Entorno virtual de Python (venv)',
      false,
      '(FALTA: ejecuta pnpm ai:setup para habilitar predicciones)'
    )
    hasErrors = true
  }

  // Comprobar estado de Google Gemini API Key
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey && geminiKey.trim().length >= 20) {
    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
    check('Clave Google Gemini (LLM Conversacional)', true, `(Activa - modelo: ${model})`)
  } else {
    check('Clave Google Gemini (LLM Conversacional)', true, `(Sin configurar - opera en modo reglas locales)`)
    console.log(`    ${c.cyan}→ Tip: Puedes ingresar tu API Key gratuita en /dashboard/inteligencia o en .env (https://aistudio.google.com/apikey)${c.reset}`)
  }

  // ─── 5. PERMISOS DE ESCRITURA EN DISCO ─────────────────────────────────────
  console.log(`\n${c.bold}💾 5. Sistema de Archivos y Permisos:${c.reset}`)
  try {
    const testFile = path.join(rootDir, '.doctor_perm_test')
    fs.writeFileSync(testFile, 'test', 'utf-8')
    fs.unlinkSync(testFile)
    check('Permisos de escritura en directorio raíz', true)
  } catch (err) {
    check('Permisos de escritura en directorio raíz', false, `(${err.message})`)
    hasErrors = true
  }

  console.log('\n---------------------------------------------------------')
  if (hasErrors) {
    console.log(
      `${c.red}${c.bold}⚠ Se detectaron observaciones críticas. Ejecuta 'pnpm setup:all' para reparar el entorno.${c.reset}\n`
    )
    process.exit(1)
  } else {
    console.log(
      `${c.green}${c.bold}🎉 Todo el sistema está correctamente configurado y listo para operar.${c.reset}`
    )
    console.log(`   Inicia la aplicación con IA: ${c.cyan}pnpm dev:ai${c.reset}`)
    console.log(`   O solo el servidor web:       ${c.cyan}pnpm dev${c.reset}\n`)
  }
}

runDoctor().catch((e) => {
  console.error('Error durante diagnóstico:', e)
  process.exit(1)
})
