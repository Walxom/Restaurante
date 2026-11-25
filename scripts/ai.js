#!/usr/bin/env node
/**
 * scripts/ai.js — ejecuta el motor de IA con el Python del entorno virtual,
 * en Windows (ai_engine\venv\Scripts) y en Linux/macOS (ai_engine/venv/bin).
 * Si no hay venv, usa el Python del sistema (útil en CI).
 *
 *   node scripts/ai.js start      # uvicorn con recarga en 127.0.0.1, puerto libre desde AI_PORT (8000)
 *   node scripts/ai.js test       # pytest ai_engine/tests
 *   node scripts/ai.js generate   # datos sintéticos de ventas para entrenar los modelos
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

const raiz = path.resolve(__dirname, '..')
const esWindows = process.platform === 'win32'
const pythonVenv = path.join(raiz, 'ai_engine', 'venv', esWindows ? 'Scripts' : 'bin', esWindows ? 'python.exe' : 'python')
const python = fs.existsSync(pythonVenv) ? pythonVenv : esWindows ? 'python' : 'python3'

const preferido = Number(process.env.AI_PORT) || 8000
// Mismo archivo que lee la web (src/lib/ai-engine.ts) para saber dónde está el motor
const archivoPuerto = path.join(raiz, 'logs', 'ai-engine.port')

function alguienResponde(puerto) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: puerto })
    socket.setTimeout(400)
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('timeout', () => { socket.destroy(); resolve(false) })
    socket.once('error', () => resolve(false))
  })
}

function sePuedeAbrir(puerto) {
  return new Promise((resolve) => {
    const servidor = net.createServer()
    servidor.once('error', () => resolve(false))
    servidor.listen(puerto, '127.0.0.1', () => servidor.close(() => resolve(true)))
  })
}

async function buscarPuertoLibre() {
  for (let puerto = preferido; puerto < preferido + 20; puerto++) {
    if (!(await alguienResponde(puerto)) && (await sePuedeAbrir(puerto))) return puerto
  }
  return null
}

const comandos = {
  start: ['-m', 'uvicorn', 'ai_engine.main:app', '--reload', '--host', '127.0.0.1', '--port'],
  test: ['-m', 'pytest', 'ai_engine/tests'],
  generate: ['-m', 'ai_engine.scripts.generate_synthetic_data'],
}

const accion = process.argv[2]
if (!comandos[accion]) {
  console.error(`Uso: node scripts/ai.js <${Object.keys(comandos).join('|')}> [argumentos extra]`)
  process.exit(2)
}

async function main() {
  const argumentos = [...comandos[accion]]
  if (accion === 'start') {
    const puerto = await buscarPuertoLibre()
    if (puerto === null) {
      console.error(`No hay puertos libres entre ${preferido} y ${preferido + 19} para el motor de IA.`)
      process.exit(1)
    }
    if (puerto !== preferido) console.log(`El puerto ${preferido} está ocupado por otra aplicación; el motor de IA usará el ${puerto}.`)
    fs.mkdirSync(path.dirname(archivoPuerto), { recursive: true })
    fs.writeFileSync(archivoPuerto, String(puerto))
    argumentos.push(String(puerto))
  }

  const r = spawnSync(python, [...argumentos, ...process.argv.slice(3)], { cwd: raiz, stdio: 'inherit' })
  if (r.error) {
    console.error(`No se pudo ejecutar ${python}: ${r.error.message}. Ejecute primero: pnpm ai:setup`)
    process.exit(1)
  }
  process.exit(r.status ?? 1)
}

main()
