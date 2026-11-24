/**
 * PRUEBA DE ESTRÉS (Stress Test) — SIGER-IA
 * Curso: Calidad y Pruebas de Software — Semana 9
 *
 * Escenario: Rampa creciente de usuarios hasta encontrar el punto de quiebre.
 * Determina la capacidad máxima del sistema antes de degradación.
 *
 * Ejecutar: k6 run tests/load/estres.js
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"
import { obtenerCookieSesion } from "./auth.js"

const errorRate = new Rate("tasa_error")
const duracionRequest = new Trend("duracion_request", true)

export const options = {
  // Rampa creciente: 0 → 10 → 50 → 100 → 150 usuarios → bajada gradual
  stages: [
    { duration: "30s", target: 10  },  // Calentamiento
    { duration: "1m",  target: 50  },  // Carga normal
    { duration: "1m",  target: 100 },  // Alta carga
    { duration: "1m",  target: 150 },  // Estrés extremo — buscamos el quiebre
    { duration: "30s", target: 0   },  // Enfriamiento
  ],
  thresholds: {
    // Durante estrés se acepta degradación; documentamos el límite real
    http_req_duration: ["p(95)<5000"],  // Umbral relajado para estrés
    tasa_error: ["rate<0.15"],           // Máximo 15% de errores bajo estrés
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001"

// Inicia sesión una sola vez (o usa K6_AUTH_COOKIE) y comparte la cookie.
export function setup() {
  return { cookie: obtenerCookieSesion(BASE_URL) }
}

export default function (data) {
  const headers = { "Content-Type": "application/json", Cookie: data.cookie }
  // Solicitud representativa: consulta de pedidos activos
  const start = Date.now()
  const res = http.get(`${BASE_URL}/api/orders?status=active&limit=20`, {
    headers,
    tags: { endpoint: "GET /api/orders (estrés)" },
  })
  duracionRequest.add(Date.now() - start)

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "respuesta < 5s": (r) => r.timings.duration < 5000,
  })

  errorRate.add(!ok)
  sleep(0.2)
}

export function handleSummary(data) {
  const stages = [10, 50, 100, 150]
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] ?? "N/A"
  const maxUsers = data.metrics.vus_max?.values?.max ?? "N/A"
  const errRate = data.metrics.tasa_error?.values?.rate ?? "N/A"

  const resumen = {
    timestamp: new Date().toISOString(),
    escenario: "Estrés con rampa — hasta 150 VUs",
    resultado: {
      p95_ms: Math.round(p95),
      max_vus_alcanzados: maxUsers,
      tasa_error_pct: Math.round(errRate * 10000) / 100,
      rampa_vus: stages,
      punto_quiebre_estimado: errRate > 0.05 ? `~${maxUsers} VUs` : "No alcanzado",
    },
  }

  return {
    stdout: `\n=== RESULTADO PRUEBA DE ESTRÉS ===\np95: ${resumen.resultado.p95_ms} ms | VUs máx: ${maxUsers} | Errores: ${resumen.resultado.tasa_error_pct}%\nPunto de quiebre: ${resumen.resultado.punto_quiebre_estimado}\n`,
    "tests/load/resultado_estres.json": JSON.stringify(resumen, null, 2),
  }
}
