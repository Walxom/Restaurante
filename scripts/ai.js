#!/usr/bin/env node
/**
 * scripts/ai.js — ejecuta el motor de IA con el Python del entorno virtual,
 * en Windows (ai_engine\venv\Scripts) y en Linux/macOS (ai_engine/venv/bin).
 * Si no hay venv, usa el Python del sistema (útil en CI).
 *
 *   node scripts/ai.js start      # uvicorn con recarga en 127.0.0.1:8000
 *   node scripts/ai.js test       # pytest ai_engine/tests
 *   node scripts/ai.js generate   # datos sintéticos de ventas para entrenar los modelos
 */
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const raiz = path.resolve(__dirname, '..')
const esWindows = process.platform === 'win32'
const pythonVenv = path.join(raiz, 'ai_engine', 'venv', esWindows ? 'Scripts' : 'bin', esWindows ? 'python.exe' : 'python')
const python = fs.existsSync(pythonVenv) ? pythonVenv : esWindows ? 'python' : 'python3'

const comandos = {
  start: ['-m', 'uvicorn', 'ai_engine.main:app', '--reload', '--host', '127.0.0.1', '--port', process.env.AI_PORT || '8000'],
  test: ['-m', 'pytest', 'ai_engine/tests'],
  generate: ['-m', 'ai_engine.scripts.generate_synthetic_data'],
}

const accion = process.argv[2]
if (!comandos[accion]) {
  console.error(`Uso: node scripts/ai.js <${Object.keys(comandos).join('|')}> [argumentos extra]`)
  process.exit(2)
}

const r = spawnSync(python, [...comandos[accion], ...process.argv.slice(3)], { cwd: raiz, stdio: 'inherit' })
if (r.error) {
  console.error(`No se pudo ejecutar ${python}: ${r.error.message}. Ejecute primero: pnpm ai:setup`)
  process.exit(1)
}
process.exit(r.status ?? 1)
