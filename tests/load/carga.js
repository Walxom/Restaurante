/**
 * PRUEBA DE CARGA (Load Test) — SIGER-IA
 * Curso: Calidad y Pruebas de Software — Semana 8
 *
 * Escenario: 50 usuarios virtuales registrando pedidos simultáneamente
 * durante 1 minuto, evaluando cumplimiento del RNF04 (p95 < 2000 ms).
 *
 * Ejecutar: k6 run tests/load/carga.js
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Rate, Trend } from "k6/metrics"
import { obtenerCookieSesion } from "./auth.js"

// ─── Métricas personalizadas ─────────────────────────────────────────────────
const errorRate = new Rate("tasa_error")
const duracionPedido = new Trend("duracion_creacion_pedido", true)

// ─── Configuración del escenario ─────────────────────────────────────────────
export const options = {
  scenarios: {
    carga_sostenida: {
      executor: "constant-vus",
      vus: 50,        // 50 usuarios virtuales simultáneos
      duration: "1m", // durante 1 minuto
    },
  },
  thresholds: {
    // RNF04: El sistema debe responder en < 2 segundos bajo carga normal
    http_req_duration: ["p(95)<2000"],
    // Tasa de error inferior al 5%
    tasa_error: ["rate<0.05"],
    // Métrica específica de creación de pedidos
    duracion_creacion_pedido: ["p(95)<2000"],
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001"

// ─── Autenticación y datos de prueba (una sola vez) ──────────────────────────
// Inicia sesión (o usa K6_AUTH_COOKIE) y elige un producto disponible real.
export function setup() {
  const cookie = obtenerCookieSesion(BASE_URL)
  let productId = __ENV.PRODUCT_ID_1
  if (!productId) {
    const res = http.get(`${BASE_URL}/api/products?isAvailable=true`, { headers: { Cookie: cookie } })
    const productos = res.json()
    productId = Array.isArray(productos) && productos.length > 0 ? productos[0].id : "sin-productos"
  }
  return { cookie, productId }
}

// ─── Escenario principal ──────────────────────────────────────────────────────
export default function (data) {
  const vuId = __VU   // ID del usuario virtual (1-50)
  const iter = __ITER // Número de iteración
  const headers = { "Content-Type": "application/json", Cookie: data.cookie }

  // 1. Consultar productos disponibles (GET — lectura)
  const resProductos = http.get(`${BASE_URL}/api/products?isAvailable=true`, {
    headers,
    tags: { endpoint: "GET /api/products" },
  })

  check(resProductos, {
    "productos: status 200": (r) => r.status === 200,
    "productos: tiene datos": (r) => {
      try {
        const body = JSON.parse(r.body)
        return Array.isArray(body) && body.length > 0
      } catch {
        return false
      }
    },
  })

  errorRate.add(resProductos.status !== 200)
  sleep(0.5)

  // 2. Crear un pedido (POST — escritura bajo concurrencia)
  // PARA_LLEVAR: no compite por mesas (un pedido MESA exige tableId y mesa libre).
  const payload = JSON.stringify({
    type: "PARA_LLEVAR",
    customerName: `Cliente-VU${vuId}-Iter${iter}`,
    items: [
      { productId: data.productId, quantity: 1 },
    ],
    notes: `Prueba de carga k6 — VU:${vuId} Iter:${iter}`,
  })

  const startTime = Date.now()
  const resPedido = http.post(`${BASE_URL}/api/orders`, payload, {
    headers,
    tags: { endpoint: "POST /api/orders" },
  })
  duracionPedido.add(Date.now() - startTime)

  const pedidoExitoso = check(resPedido, {
    "pedido: status 201 o 200": (r) => r.status === 201 || r.status === 200,
    "pedido: tiene ID": (r) => {
      try {
        const body = JSON.parse(r.body)
        return !!body.id
      } catch {
        return false
      }
    },
  })

  errorRate.add(!pedidoExitoso)

  // 3. Consultar pedidos activos (GET — lectura concurrente)
  const resPedidos = http.get(`${BASE_URL}/api/orders?status=active&limit=10`, {
    headers,
    tags: { endpoint: "GET /api/orders" },
  })

  check(resPedidos, {
    "pedidos activos: status 200": (r) => r.status === 200,
  })

  sleep(1) // Pausa realista entre interacciones (1 segundo)
}

// ─── Resumen final ───────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] ?? "N/A"
  const p99 = data.metrics.http_req_duration?.values?.["p(99)"] ?? "N/A"
  const avgDuracion = data.metrics.http_req_duration?.values?.avg ?? "N/A"
  const throughput = data.metrics.http_reqs?.values?.rate ?? "N/A"
  const errores = data.metrics.tasa_error?.values?.rate ?? "N/A"

  const resumen = {
    timestamp: new Date().toISOString(),
    escenario: "Carga sostenida — 50 VUs x 1 min",
    rnf04_umbral_ms: 2000,
    resultado: {
      p95_ms: Math.round(p95),
      p99_ms: Math.round(p99),
      avg_ms: Math.round(avgDuracion),
      throughput_rps: Math.round(throughput * 100) / 100,
      tasa_error_pct: Math.round(errores * 10000) / 100,
      cumple_rnf04: p95 < 2000,
    },
  }

  return {
    stdout: `\n=== RESULTADO PRUEBA DE CARGA ===\np95: ${resumen.resultado.p95_ms} ms | p99: ${resumen.resultado.p99_ms} ms | Throughput: ${resumen.resultado.throughput_rps} req/s | Errores: ${resumen.resultado.tasa_error_pct}%\nRNF04 (p95 < 2000 ms): ${resumen.resultado.cumple_rnf04 ? "✅ CUMPLE" : "❌ NO CUMPLE"}\n`,
    "tests/load/resultado_carga.json": JSON.stringify(resumen, null, 2),
  }
}
