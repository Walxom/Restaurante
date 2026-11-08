#!/usr/bin/env node
/**
 * scripts/setup-system.js
 * ============================================================================
 * Script de inicialización y montaje automatizado Turnkey para SIGER-IA.
 * Ejecuta validaciones de entorno, autogenera .env con claves criptográficas,
 * instala dependencias, sincroniza base de datos SQLite y aprovisiona el
 * microservicio Python de Inteligencia Artificial (Full-Stack).
 * ============================================================================
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const rootDir = path.resolve(__dirname, '..')

// Colores ANSI
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m'
}

function log(msg) { console.log(msg) }
function success(msg) { console.log(`${c.green}✔ ${msg}${c.reset}`) }
function warn(msg) { console.log(`${c.yellow}⚠ ${msg}${c.reset}`) }
function info(msg) { console.log(`${c.cyan}ℹ ${msg}${c.reset}`) }
function error(msg) { console.error(`${c.red}✖ ${msg}${c.reset}`) }

function run(cmd, desc) {
  log(`\n${c.bold}⚙ Ejecutando: ${desc}...${c.reset}`)
  log(`${c.dim}> ${cmd}${c.reset}`)
  try {
    execSync(cmd, { cwd: rootDir, stdio: 'inherit' })
    success(`${desc} completado.`)
  } catch {
    error(`Fallo durante: ${desc}`)
    process.exit(1)
  }
}

function banner() {
  log('')
  log(`${c.cyan}${c.bold}=================================================================${c.reset}`)
  log(`${c.cyan}${c.bold}       SIGER-IA - MONTAJE Y CONFIGURACIÓN AUTOMATIZADA           ${c.reset}`)
  log(`${c.cyan}${c.bold}   Sistema Integral de Gestión de Restaurantes y POS con IA      ${c.reset}`)
  log(`${c.cyan}${c.bold}=================================================================${c.reset}`)
  log('')
}

function checkPrerequisites() {
  log(`${c.bold}[1/6] Verificando Prerrequisitos del Sistema...${c.reset}`)
  
  // 1. Node.js version
  const nodeVersion = process.versions.node
  const major = parseInt(nodeVersion.split('.')[0], 10)
  if (major < 20) {
    warn(`Se detectó Node.js v${nodeVersion}. Se recomienda Node.js v20.10.0 LTS o superior.`)
  } else {
    success(`Node.js v${nodeVersion} detectado (compatible).`)
  }

  // 2. pnpm check
  try {
    const pnpmVer = execSync('pnpm -v', { encoding: 'utf-8' }).trim()
    success(`pnpm v${pnpmVer} detectado.`)
  } catch {
    error('pnpm no está instalado globalmente. Instálalo con: npm install -g pnpm o corepack enable')
    process.exit(1)
  }

  // 3. uv / Python check
  try {
    const uvVer = execSync('uv --version', { encoding: 'utf-8' }).trim()
    success(`${uvVer} detectado (gestor de Python ultrarrápido).`)
  } catch {
    try {
      const pyVer = execSync('python --version', { encoding: 'utf-8' }).trim()
      info(`Python detectado: ${pyVer} (se recomienda instalar 'uv' para descargas portables de Python 3.10).`)
    } catch {
      warn('No se detectó Python ni uv en PATH. Se intentará auto-configuración en el paso de IA.')
    }
  }
}

function setupEnvironmentFile() {
  log(`\n${c.bold}[2/6] Configurando Variables de Entorno (.env)...${c.reset}`)
  
  const envPath = path.join(rootDir, '.env')
  const envExamplePath = path.join(rootDir, '.env.example')
  
  if (!fs.existsSync(envExamplePath)) {
    error('No se encontró el archivo .env.example en la raíz.')
    process.exit(1)
  }

  let envContent = ''
  let generatedSecret = ''

  if (!fs.existsSync(envPath)) {
    info('No se encontró archivo .env. Creando a partir de .env.example...')
    envContent = fs.readFileSync(envExamplePath, 'utf-8')
    
    // Generar un NEXTAUTH_SECRET seguro de 32 bytes (base64)
    generatedSecret = crypto.randomBytes(32).toString('base64')
    envContent = envContent.replace(
      /NEXTAUTH_SECRET=.*/,
      `NEXTAUTH_SECRET="${generatedSecret}"`
    )

    fs.writeFileSync(envPath, envContent, 'utf-8')
    success('Archivo .env creado con un NEXTAUTH_SECRET criptográfico único.')
  } else {
    success('Archivo .env ya existente detectado.')
    envContent = fs.readFileSync(envPath, 'utf-8')
    
    // Validar si tiene NEXTAUTH_SECRET configurado
    if (!envContent.includes('NEXTAUTH_SECRET=') || envContent.includes('NEXTAUTH_SECRET=""')) {
      warn('NEXTAUTH_SECRET no está configurado en .env. Inyectando clave segura...')
      generatedSecret = crypto.randomBytes(32).toString('base64')
      envContent += `\nNEXTAUTH_SECRET="${generatedSecret}"\n`
      fs.writeFileSync(envPath, envContent, 'utf-8')
      success('NEXTAUTH_SECRET actualizado exitosamente en .env.')
    }

    // Validar si tiene DATABASE_URL configurado
    if (!envContent.includes('DATABASE_URL=')) {
      warn('DATABASE_URL no está configurada en .env. Inyectando default SQLite...')
      envContent += `\nDATABASE_URL="file:./dev.db"\n`
      fs.writeFileSync(envPath, envContent, 'utf-8')
      success('DATABASE_URL configurada en .env.')
    }
  }

  // Cargar las variables en el proceso actual
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath)
    } catch {}
  }
}

function setupDependencies() {
  log(`\n${c.bold}[3/6] Verificando Dependencias de Node.js...${c.reset}`)
  run('pnpm install', 'Instalación de paquetes con pnpm')
}

function setupDatabase() {
  log(`\n${c.bold}[4/6] Aprovisionando Base de Datos SQLite (Prisma ORM)...${c.reset}`)
  
  // 1. Generar cliente Prisma
  run('pnpm prisma generate', 'Generación de Prisma Client')

  // 2. Sincronizar schema
  run('pnpm prisma db push --skip-generate', 'Sincronización del esquema de base de datos (db push)')

  // 3. Ejecutar seed de datos iniciales
  run('pnpm tsx --env-file-if-exists=.env prisma/seed.ts', 'Poblado de datos iniciales (Seed)')
}

function setupAiEngine() {
  log(`\n${c.bold}[5/6] Configurando Motor de Inteligencia Artificial (ai_engine)...${c.reset}`)

  const isWin = process.platform === 'win32'
  const venvPython = path.join(rootDir, 'ai_engine', 'venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python')

  if (fs.existsSync(venvPython)) {
    success('Entorno virtual de Python ya configurado en ai_engine/venv.')
  } else {
    info('Entorno virtual de Python no detectado. Inicializando con uv/python...')
    try {
      execSync('node ai_engine/scripts/setup_env.js', { cwd: rootDir, stdio: 'inherit' })
      success('Entorno virtual de Inteligencia Artificial creado exitosamente.')
    } catch {
      warn('No se pudo completar la configuración automática de IA. Puedes correr manualmente: pnpm ai:setup')
    }
  }
}

function verifyHealth() {
  log(`\n${c.bold}[6/6] Ejecutando Diagnóstico de Salud (Doctor)...${c.reset}`)
  
  try {
    execSync('node scripts/doctor.js', { cwd: rootDir, stdio: 'inherit' })
  } catch {
    warn('El diagnóstico reportó alguna observación menor. Revisa los mensajes anteriores.')
  }
}

function printInstructions() {
  log('')
  log(`${c.green}${c.bold}=================================================================${c.reset}`)
  log(`${c.green}${c.bold}        ¡SISTEMA MONTADO Y CONFIGURADO EXITOSAMENTE! 🎉          ${c.reset}`)
  log(`${c.green}${c.bold}=================================================================${c.reset}`)
  log('')
  log(`${c.bold}Credenciales oficiales de acceso:${c.reset}`)
  log(`  • ${c.bold}Administrador (JEFE):${c.reset}  Usuario: ${c.cyan}jefe${c.reset}    | Contraseña: ${c.cyan}admin123${c.reset}`)
  log(`  • ${c.bold}Camarero (MESERO):${c.reset}    Usuario: ${c.cyan}mesero${c.reset}  | Contraseña: ${c.cyan}mesero123${c.reset}`)
  log('')
  log(`${c.bold}Comandos de inicio rápido:${c.reset}`)
  log(`  • ${c.bold}Servidor Web + IA Híbrida:${c.reset}   ${c.yellow}pnpm dev:ai${c.reset}   (Web :3001 + IA :8000)`)
  log(`  • ${c.bold}Servidor Web solo:${c.reset}           ${c.yellow}pnpm dev${c.reset}      (Web + WebSockets en :3001)`)
  log(`  • ${c.bold}Diagnóstico en todo momento:${c.reset} ${c.yellow}pnpm doctor${c.reset}`)
  log('')
  log(`${c.dim}Para más detalles técnicos, consulte: docs/installation/deployment-guide.md${c.reset}`)
  log('')
}

function main() {
  banner()
  checkPrerequisites()
  setupEnvironmentFile()
  setupDependencies()
  setupDatabase()
  setupAiEngine()
  verifyHealth()
  printInstructions()
}

main()
