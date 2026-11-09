import { type NextRequest, NextResponse } from "next/server"
import { validateRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { invalidateConfigCache } from "@/services/system.service"

const AI_BASE_URL = `http://127.0.0.1:${process.env.AI_PORT || 8000}`

export async function GET() {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  try {
    const config = await prisma.systemConfig.findFirst({
      where: { id: "default" },
    })

    const rawKey = config?.geminiApiKey || process.env.GEMINI_API_KEY || ""
    const isConfigured = !!rawKey.trim()
    const masked = isConfigured
      ? `${rawKey.slice(0, 6)}••••••••••••${rawKey.slice(-4)}`
      : null

    return NextResponse.json({
      configured: isConfigured,
      model: config?.geminiModel || process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      keyPreview: masked,
    })
  } catch (error) {
    console.error("[Gemini Config GET Error]:", error)
    return NextResponse.json(
      { error: "Error al consultar configuración de Gemini" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const rawKey = typeof body.apiKey === "string" ? body.apiKey.trim() : ""
    const model = (typeof body.model === "string" && body.model.trim())
      ? body.model.trim()
      : "gemini-3.1-flash-lite"

    // 1. Caso eliminación de clave
    if (!rawKey) {
      await prisma.systemConfig.upsert({
        where: { id: "default" },
        update: { geminiApiKey: null, geminiModel: model },
        create: {
          id: "default",
          companyName: "Restaurant",
          geminiApiKey: null,
          geminiModel: model,
        },
      })
      invalidateConfigCache()

      // Notificar a FastAPI si está activo
      try {
        await fetch(`${AI_BASE_URL}/api/config/gemini`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: "", model }),
          signal: AbortSignal.timeout(3000),
        })
      } catch {
        // Ignorar si el microservicio está apagado
      }

      return NextResponse.json({
        success: true,
        message: "Clave de Gemini eliminada. El sistema opera en modo reglas locales.",
        gemini: { configured: false, model },
      })
    }

    // 2. Validación de seguridad en formato de clave (OWASP: Prevención de inyección)
    // Permite claves tradicionales (AIzaSy...) y el nuevo formato Google AI Studio (AQ....)
    const geminiKeyRegex = /^[A-Za-z0-9_.-]{20,80}$/
    if (!geminiKeyRegex.test(rawKey)) {
      return NextResponse.json(
        {
          error: "Formato de clave inválido. Las claves de Google Gemini sólo contienen letras, números, puntos, guiones y guiones bajos.",
        },
        { status: 400 }
      )
    }

    // 3. Smoke Test de validación con Google AI
    // Intentar primero a través del microservicio Python si está disponible
    let validated = false
    let validationError = ""

    try {
      const fastApiRes = await fetch(`${AI_BASE_URL}/api/config/gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: rawKey, model }),
        signal: AbortSignal.timeout(10000),
      })

      if (fastApiRes.ok) {
        validated = true
      } else {
        const errorData = await fastApiRes.json().catch(() => ({}))
        validationError = errorData.detail || "La API Key fue rechazada por el motor de IA."
      }
    } catch {
      // Microservicio Python no activo: validar directamente contra la API pública de Google Gemini
      try {
        const targetModel = model || "gemini-3.1-flash-lite"
        const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(rawKey)}`
        const testRes = await fetch(googleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
          signal: AbortSignal.timeout(8000),
        })

        if (testRes.ok) {
          validated = true
        } else {
          const errData = await testRes.json().catch(() => ({}))
          validationError =
            errData?.error?.message ||
            "Clave de Google Gemini inválida o sin permisos en Google AI Studio."
        }
      } catch (directErr) {
        const msg = directErr instanceof Error ? directErr.message : "Error de conexión"
        validationError = `No se pudo conectar con Google AI Studio para verificar la clave (${msg}).`
      }
    }

    if (!validated) {
      return NextResponse.json(
        { error: validationError || "API Key de Gemini rechazada por Google." },
        { status: 400 }
      )
    }

    // 4. Guardar en base de datos SQLite (SystemConfig)
    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: { geminiApiKey: rawKey, geminiModel: model },
      create: {
        id: "default",
        companyName: "Restaurant",
        geminiApiKey: rawKey,
        geminiModel: model,
      },
    })
    invalidateConfigCache()

    return NextResponse.json({
      success: true,
      message: "API Key de Google Gemini verificada y guardada correctamente.",
      gemini: {
        configured: true,
        model,
        keyPreview: `${rawKey.slice(0, 6)}••••••••••••${rawKey.slice(-4)}`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    console.error("[Gemini Config POST Error]:", err)
    return NextResponse.json(
      { error: `Error interno al procesar la configuración: ${message}` },
      { status: 500 }
    )
  }
}
