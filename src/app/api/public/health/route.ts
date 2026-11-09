import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * /api/public/health
 * ============================================================================
 * Endpoint de Telemetría y Salud del Sistema SRE para SIGER-IA.
 * 
 * Expone métricas clave sin requerir autenticación para:
 * 1. Docker Compose / Kubernetes liveness y readiness probes.
 * 2. Monitores de proceso en borde (PM2, systemd, monit).
 * 3. Dashboards de observabilidad en red local.
 * ============================================================================
 */
export async function GET() {
  const startTime = performance.now()
  const uptimeSeconds = Math.floor(process.uptime())
  const memoryUsage = process.memoryUsage()

  // 1. Chequeo de Base de Datos Relacional (SQLite)
  let dbStatus: "up" | "down" = "down"
  let dbLatencyMs = 0
  try {
    const dbStart = performance.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Math.round((performance.now() - dbStart) * 100) / 100
    dbStatus = "up"
  } catch {
    dbStatus = "down"
  }

  // 2. Chequeo del Microservicio de Inteligencia Artificial (FastAPI)
  let aiStatus: "up" | "down" | "disabled" = "disabled"
  let aiLatencyMs = 0
  const aiEngineEnabled = process.env.AI_ENGINE_ENABLED !== "false"
  const aiEngineUrl = process.env.AI_ENGINE_URL || "http://localhost:8000"

  if (aiEngineEnabled) {
    try {
      const aiStart = performance.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)

      const res = await fetch(`${aiEngineUrl}/docs`, {
        signal: controller.signal,
        cache: "no-store",
      })
      clearTimeout(timeoutId)

      aiLatencyMs = Math.round((performance.now() - aiStart) * 100) / 100
      aiStatus = res.ok ? "up" : "down"
    } catch {
      aiStatus = "down"
    }
  }

  const isHealthy = dbStatus === "up"
  const totalDurationMs = Math.round((performance.now() - startTime) * 100) / 100

  const responsePayload = {
    status: isHealthy ? (aiStatus === "down" ? "degraded" : "ok") : "down",
    system: "siger-ia",
    version: "0.1.0",
    uptimeSeconds,
    timestamp: new Date().toISOString(),
    components: {
      database: {
        engine: "sqlite",
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      aiEngine: {
        enabled: aiEngineEnabled,
        status: aiStatus,
        latencyMs: aiLatencyMs,
      },
      memory: {
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
    },
    latencyMs: totalDurationMs,
  }

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}
