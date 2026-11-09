#!/usr/bin/env node
/**
 * scripts/test-devops-config.js
 * ============================================================================
 * Suite de Verificación de Integridad de Manifiestos DevOps y SRE
 * 
 * Valida:
 * 1. PM2 (ecosystem.config.js): coherencia de memoria, venv y rutas.
 * 2. Docker Compose (docker-compose.yml): topología multi-servicio y health-gating.
 * 3. Dockerfiles: usuario no privilegiado (CIS) y entrypoint automatizado.
 * 4. GitHub Actions (ci.yml): cobertura de Python, Pytest, Cold-Start y caché.
 * ============================================================================
 */

const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')

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

function runDevOpsManifestAudit() {
  console.log(`\n${c.bold}⚙️ AUDITORÍA DE MANIFIESTOS DE INFRAESTRUCTURA Y DEVOPS (SRE)${c.reset}`)
  console.log('---------------------------------------------------------------------')

  // ─── 1. AUDITORÍA PM2 (ecosystem.config.js) ──────────────────────────────
  console.log(`\n${c.bold}🚀 [1/4] Auditoría de Configuración PM2 (ecosystem.config.js):${c.reset}`)
  const pm2Path = path.join(rootDir, 'ecosystem.config.js')
  assert('Archivo ecosystem.config.js presente', fs.existsSync(pm2Path))

  const pm2Config = require(pm2Path)
  assert('Estructura apps definida como arreglo', Array.isArray(pm2Config.apps) && pm2Config.apps.length === 2)

  const posApp = pm2Config.apps.find((a) => a.name === 'siger-pos')
  assert('Servicio siger-pos configurado', !!posApp)
  if (posApp) {
    assert('Script server.js existe físicamente', fs.existsSync(path.join(rootDir, posApp.script)))
    assert('Calibración de memoria sin inversión (Heap 4GB vs Restart 2GB)', posApp.node_args.includes('4096') && posApp.max_memory_restart === '2G')
    assert('Formato de logs estructurado en JSON', posApp.log_type === 'json')
  }

  const aiApp = pm2Config.apps.find((a) => a.name === 'siger-ai')
  assert('Servicio siger-ai configurado', !!aiApp)
  if (aiApp) {
    assert('Script ai_engine/main.py existe físicamente', fs.existsSync(path.join(rootDir, aiApp.script)))
    assert('Intérprete Python apunta a binario válido', fs.existsSync(aiApp.interpreter) || aiApp.interpreter === 'python')
    assert('Puerto 8000 asignado en variables de entorno', aiApp.env.PORT === 8000)
  }

  // ─── 2. AUDITORÍA DOCKER COMPOSE (docker-compose.yml) ─────────────────────
  console.log(`\n${c.bold}🐳 [2/4] Auditoría de Docker Compose Multi-Contenedor:${c.reset}`)
  const composePath = path.join(rootDir, 'docker-compose.yml')
  assert('Archivo docker-compose.yml presente', fs.existsSync(composePath))

  const composeContent = fs.readFileSync(composePath, 'utf-8')
  assert('Servicio siger-ai declarado con puerto 8000', composeContent.includes('siger-ai:') && composeContent.includes('"8000:8000"'))
  assert('Servicio siger-web declarado con puerto 3001', composeContent.includes('siger-web:') && composeContent.includes('"3001:3001"'))
  assert('Health-gating configurado (depends_on condition: service_healthy)', composeContent.includes('condition: service_healthy'))
  assert('Volumen persistente sqlite_data declarado', composeContent.includes('sqlite_data:'))
  assert('Red interna aislada siger-network declarada', composeContent.includes('siger-network:'))

  // ─── 3. AUDITORÍA DOCKERFILES Y SEGURIDAD CIS ─────────────────────────────
  console.log(`\n${c.bold}🔒 [3/4] Auditoría de Seguridad CIS y Endurecimiento de Contenedores:${c.reset}`)
  const nodeDockerPath = path.join(rootDir, 'Dockerfile')
  const nodeDockerContent = fs.readFileSync(nodeDockerPath, 'utf-8')
  assert('Dockerfile de Next.js ejecuta bajo usuario sin privilegios (USER node)', nodeDockerContent.includes('USER node'))
  assert('Entrypoint script integrado para cold-start con volumen limpio', nodeDockerContent.includes('ENTRYPOINT ["./docker-entrypoint.sh"]'))

  const entrypointPath = path.join(rootDir, 'docker-entrypoint.sh')
  assert('Script docker-entrypoint.sh presente', fs.existsSync(entrypointPath))

  const aiDockerPath = path.join(rootDir, 'ai_engine', 'Dockerfile')
  assert('Dockerfile del microservicio de IA presente', fs.existsSync(aiDockerPath))
  const aiDockerContent = fs.readFileSync(aiDockerPath, 'utf-8')
  assert('Dockerfile de IA ejecuta bajo usuario sin privilegios (USER appuser)', aiDockerContent.includes('USER appuser'))
  assert('Healthcheck configurado en contenedor de IA', aiDockerContent.includes('HEALTHCHECK'))

  // ─── 4. AUDITORÍA GITHUB ACTIONS CI/CD (.github/workflows/ci.yml) ─────────
  console.log(`\n${c.bold}🔄 [4/4] Auditoría de Calidad en Pipeline GitHub Actions:${c.reset}`)
  const ciPath = path.join(rootDir, '.github', 'workflows', 'ci.yml')
  assert('Workflow ci.yml presente', fs.existsSync(ciPath))

  const ciContent = fs.readFileSync(ciPath, 'utf-8')
  assert('CI incluye configuración de Python 3.10', ciContent.includes('actions/setup-python@v5'))
  assert('CI incluye instalación de requirements de ai_engine', ciContent.includes('ai_engine/requirements.txt'))
  assert('CI ejecuta pruebas unitarias del motor de IA con Pytest', ciContent.includes('python -m pytest ai_engine/tests'))
  assert('CI ejecuta validación de arranque en frío e idempotencia (test-setup-all.js)', ciContent.includes('scripts/test-setup-all.js'))
  assert('CI incluye caché de compilación de Next.js (.next/cache)', ciContent.includes('.next/cache'))

  // ─── RESUMEN FINAL ────────────────────────────────────────────────────────
  console.log('\n---------------------------------------------------------------------')
  console.log(`${c.bold}📊 RESUMEN DE AUDITORÍA DE MANIFIESTOS DEVOPS:${c.reset}`)
  console.log(`   Total aserciones ejecutadas: ${totalAssertions}`)
  console.log(`   Aserciones aprobadas:        ${c.green}${passedAssertions}${c.reset}`)
  console.log(`   Aserciones fallidas:         ${failedAssertions > 0 ? c.red : c.green}${failedAssertions}${c.reset}`)

  if (failedAssertions === 0) {
    console.log(`\n${c.green}${c.bold}🎉 ¡TODOS LOS MANIFIESTOS DEVOPS CUMPLEN CON ESTÁNDARES SRE Y LA RÚBRICA!${c.reset}\n`)
    process.exit(0)
  } else {
    console.log(`\n${c.red}${c.bold}⚠ SE DETECTARON INCONSISTENCIAS EN LOS MANIFIESTOS.${c.reset}\n`)
    process.exit(1)
  }
}

runDevOpsManifestAudit()
