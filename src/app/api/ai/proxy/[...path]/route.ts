import { type NextRequest, NextResponse } from "next/server"
import { validateRole } from "@/lib/auth-utils"
import { getAiEngineUrl } from "@/lib/ai-engine"

async function forwardRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // Asegurar autenticación para proteger endpoints del motor de IA
  const auth = await validateRole(["JEFE", "MESERO"])
  if (!auth.isValid) {
    return auth.response
  }

  const resolvedParams = await params
  const targetPath = (resolvedParams.path || []).join("/")
  const search = request.nextUrl.search || ""
  const targetUrl = `${getAiEngineUrl()}/${targetPath}${search}`

  try {
    const controller = new AbortController()
    // 25s timeout para permitir pronósticos y LLM, pero evitar bloqueos indefinidos
    const timeout = setTimeout(() => controller.abort(), 25000)

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }

    let body: string | undefined = undefined
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        const text = await request.text()
        if (text) {
          body = text
        }
      } catch {
        // Body vacío
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
    })

    clearTimeout(timeout)

    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    })
  } catch (error: unknown) {
    const isAbort = error instanceof Error && error.name === "AbortError"
    return NextResponse.json(
      {
        status: "offline",
        error: isAbort ? "Tiempo de espera agotado al consultar motor de IA" : "Motor de IA desconectado o no disponible",
      },
      { status: 503 }
    )
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forwardRequest(request, context)
}
