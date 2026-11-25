import { type NextRequest, NextResponse } from "next/server"
import { validateRole } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"
import { invalidateConfigCache } from "@/services/system.service"

import { getAiEngineUrl } from "@/lib/ai-engine"

const MODELO_POR_DEFECTO = "gemini-3.1-flash-lite"

function enmascarar(clave: string): string {
  return `${clave.slice(0, 6)}••••••••••••${clave.slice(-4)}`
}

/**
 * Prueba la clave con el modelo elegido. Primero a través del motor de IA (que además
 * la activa en memoria); si el motor está apagado, directamente contra Google.
 */
async function validarConGoogle(clave: string, modelo: string): Promise<string | null> {
  try {
    const fastApiRes = await fetch(`${getAiEngineUrl()}/api/config/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: clave, model: modelo }),
      signal: AbortSignal.timeout(10000),
    })
    if (fastApiRes.ok) return null
    const errorData = await fastApiRes.json().catch(() => ({}))
    return errorData.detail || "La API Key fue rechazada por el motor de IA."
  } catch {
    // Motor de IA apagado: se valida directamente contra la API pública de Google Gemini
  }

  try {
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(clave)}`
    const testRes = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (testRes.ok) return null
    const errData = await testRes.json().catch(() => ({}))
    return errData?.error?.message || "Clave de Google Gemini inválida o sin permisos en Google AI Studio."
  } catch (directErr) {
    const msg = directErr instanceof Error ? directErr.message : "Error de conexión"
    return `No se pudo conectar con Google AI Studio para verificar la clave (${msg}).`
  }
}

export async function GET() {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  try {
    const config = await prisma.systemConfig.findFirst({
      where: { id: "default" },
    })

    const rawKey = config?.geminiApiKey || process.env.GEMINI_API_KEY || ""
    const isConfigured = !!rawKey.trim()
    const masked = isConfigured ? enmascarar(rawKey) : null

    return NextResponse.json({
      configured: isConfigured,
      model: config?.geminiModel || process.env.GEMINI_MODEL || MODELO_POR_DEFECTO,
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

/**
 * Cuerpo aceptado:
 * - `{ action: "delete" }`: desvincula la clave.
 * - `{ apiKey, model }`: valida y guarda una clave nueva con ese modelo.
 * - `{ model }` sin apiKey: cambia solo el modelo y conserva la clave ya guardada.
 */
export async function POST(request: NextRequest) {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const nuevaClave = typeof body.apiKey === "string" ? body.apiKey.trim() : ""
    const model = (typeof body.model === "string" && body.model.trim())
      ? body.model.trim()
      : MODELO_POR_DEFECTO

    // 1. Desvincular la clave
    if (body.action === "delete") {
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
        await fetch(`${getAiEngineUrl()}/api/config/gemini`, {
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

    // 2. Sin clave nueva: cambiar solo el modelo con la clave ya guardada
    let clave = nuevaClave
    if (!clave) {
      const config = await prisma.systemConfig.findFirst({ where: { id: "default" } })
      clave = (config?.geminiApiKey || process.env.GEMINI_API_KEY || "").trim()
      if (!clave) {
        return NextResponse.json(
          { error: "Ingresa la API Key de Google Gemini para activarlo." },
          { status: 400 }
        )
      }
    } else {
      // Validación de formato (OWASP: prevención de inyección).
      // Permite claves tradicionales (AIzaSy...) y el formato nuevo de Google AI Studio (AQ....)
      const geminiKeyRegex = /^[A-Za-z0-9_.-]{20,80}$/
      if (!geminiKeyRegex.test(clave)) {
        return NextResponse.json(
          {
            error: "Formato de clave inválido. Las claves de Google Gemini sólo contienen letras, números, puntos, guiones y guiones bajos.",
          },
          { status: 400 }
        )
      }
    }

    // 3. Prueba real con Google usando el modelo elegido
    const errorValidacion = await validarConGoogle(clave, model)
    if (errorValidacion) {
      return NextResponse.json(
        {
          error: nuevaClave
            ? errorValidacion
            : `No se pudo cambiar al modelo ${model}: ${errorValidacion}`,
        },
        { status: 400 }
      )
    }

    // 4. Guardar. La clave solo se escribe si el usuario ingresó una nueva.
    const datos = nuevaClave
      ? { geminiApiKey: nuevaClave, geminiModel: model }
      : { geminiModel: model }
    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: datos,
      create: { id: "default", companyName: "Restaurant", ...datos },
    })
    invalidateConfigCache()

    return NextResponse.json({
      success: true,
      message: nuevaClave
        ? "API Key de Google Gemini verificada y guardada correctamente."
        : `Modelo cambiado a ${model}. Se conserva la API Key actual.`,
      gemini: {
        configured: true,
        model,
        keyPreview: enmascarar(clave),
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
