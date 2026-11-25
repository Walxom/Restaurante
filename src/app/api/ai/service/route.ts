import { type NextRequest, NextResponse } from "next/server"
import { validateRole } from "@/lib/auth-utils"
import { spawn, execSync } from "child_process"
import path from "path"
import fs from "fs"
import { AI_ENGINE_URL } from "@/lib/ai-engine"

const LOGS_DIR = path.join(process.cwd(), "logs")
const PID_FILE = path.join(LOGS_DIR, "ai-engine.pid")
const LEGACY_PID_FILE = path.join(process.cwd(), ".ai_engine.pid")
const LOG_FILE = path.join(LOGS_DIR, "ai-engine.log")
const AI_PORT = Number(process.env.AI_PORT) || 8000
const AI_HEALTH_URL = `${AI_ENGINE_URL}/health`

/**
 * Estado del puerto del motor de IA:
 * - "ok": responde el motor de SIGER.
 * - "ajeno": responde otra aplicación (por ejemplo, otro proyecto en WSL o Docker).
 * - "caido": no responde nada.
 */
type EstadoPuerto = "ok" | "ajeno" | "caido"

async function getAiPortState(timeoutMs = 1500): Promise<EstadoPuerto> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(AI_HEALTH_URL, {
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timer)
    const data = await res.json().catch(() => null)
    return data?.status === "ok" && data?.service === "ai-engine" ? "ok" : "ajeno"
  } catch {
    return "caido"
  }
}

async function checkAiHealth(timeoutMs = 1500): Promise<boolean> {
  return (await getAiPortState(timeoutMs)) === "ok"
}

const MENSAJE_PUERTO_AJENO =
  `El puerto ${AI_PORT} está ocupado por otra aplicación, no por el motor de IA de SIGER. ` +
  `Cierre esa aplicación o inicie SIGER con otro puerto (PowerShell: $env:AI_PORT = "8010"; pnpm dev).`

function isAiProcess(pid: number): boolean {
  if (!pid || isNaN(pid) || pid <= 0) return false
  const isWin = process.platform === "win32"
  try {
    if (isWin) {
      const output = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).toLowerCase()
      return output.includes("python") || output.includes("uvicorn")
    } else {
      const output = execSync(`ps -p ${pid} -o comm=`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).toLowerCase()
      return output.includes("python") || output.includes("uvicorn")
    }
  } catch {
    return false
  }
}

function getSavedPid(): number | null {
  try {
    // 1. Intentar leer desde logs/ai-engine.pid
    if (fs.existsSync(PID_FILE)) {
      const pidStr = fs.readFileSync(PID_FILE, "utf-8").trim()
      const pid = parseInt(pidStr, 10)
      return isNaN(pid) ? null : pid
    }
    // 2. Compatibilidad hacia atrás: leer legado .ai_engine.pid si existe y migrarlo
    if (fs.existsSync(LEGACY_PID_FILE)) {
      const legacyStr = fs.readFileSync(LEGACY_PID_FILE, "utf-8").trim()
      const pid = parseInt(legacyStr, 10)
      if (!isNaN(pid)) {
        savePid(pid)
        try {
          fs.unlinkSync(LEGACY_PID_FILE)
        } catch {}
        return pid
      }
    }
  } catch {
    // Ignore read errors
  }
  return null
}

function savePid(pid: number): void {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true })
    }
    fs.writeFileSync(PID_FILE, pid.toString(), "utf-8")
    if (fs.existsSync(LEGACY_PID_FILE)) {
      try {
        fs.unlinkSync(LEGACY_PID_FILE)
      } catch {}
    }
  } catch (err) {
    console.error("[AI Service API] Error saving PID file:", err)
  }
}

function clearPid(): void {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE)
    }
    if (fs.existsSync(LEGACY_PID_FILE)) {
      fs.unlinkSync(LEGACY_PID_FILE)
    }
  } catch (err) {
    console.error("[AI Service API] Error removing PID file:", err)
  }
}

function resolveUvicornCommand(): { command: string; args: string[] } {
  const isWin = process.platform === "win32"
  const venvUvicorn = path.join(
    process.cwd(),
    "ai_engine",
    "venv",
    isWin ? "Scripts" : "bin",
    isWin ? "uvicorn.exe" : "uvicorn"
  )

  if (fs.existsSync(venvUvicorn)) {
    return {
      command: venvUvicorn,
      args: ["ai_engine.main:app", "--host", "127.0.0.1", "--port", String(AI_PORT)],
    }
  }

  // Si no está en venv pero uv está disponible en PATH
  try {
    execSync("uv --version", { stdio: "ignore" })
    return {
      command: "uv",
      args: ["run", "--directory", "ai_engine", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(AI_PORT)],
    }
  } catch {
    // Fallback a python general
    return {
      command: isWin ? "python" : "python3",
      args: ["-m", "uvicorn", "ai_engine.main:app", "--host", "127.0.0.1", "--port", String(AI_PORT)],
    }
  }
}

function stopProcessTree(pid: number | null): void {
  const isWin = process.platform === "win32"

  if (pid) {
    if (isAiProcess(pid)) {
      try {
        if (isWin) {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" })
        } else {
          process.kill(-pid, "SIGTERM")
        }
      } catch {
        // Ignore if process already died
      }
    } else {
      console.warn(
        `[AI Service API] Proceso con PID ${pid} no coincide con python/uvicorn; se omite terminación directa por seguridad.`
      )
    }
  }

  // Liberar el puerto 8000 en Windows solo si el proceso pertenece a python/uvicorn
  if (isWin) {
    try {
      const netstatOutput = execSync(`netstat -ano | findstr :${AI_PORT}`, {
        encoding: "utf-8",
      })
      const lines = netstatOutput.trim().split("\n")
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const portPid = parseInt(parts[parts.length - 1], 10)
        if (!isNaN(portPid) && portPid > 0 && isAiProcess(portPid)) {
          execSync(`taskkill /PID ${portPid} /F`, { stdio: "ignore" })
        }
      }
    } catch {
      // Ignorar si no había conexiones activas
    }
  } else {
    try {
      execSync(`lsof -ti:${AI_PORT} | xargs kill -9`, { stdio: "ignore" })
    } catch {
      // Ignore
    }
  }

  clearPid()
}

export async function GET(request: NextRequest) {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  const isRunning = await checkAiHealth()
  let savedPid = getSavedPid()

  // Limpieza automática si el microservicio no responde y el PID es huérfano
  if (!isRunning && savedPid) {
    if (!isAiProcess(savedPid)) {
      clearPid()
      savedPid = null
    }
  }

  const isWin = process.platform === "win32"
  const venvUvicorn = path.join(
    process.cwd(),
    "ai_engine",
    "venv",
    isWin ? "Scripts" : "bin",
    isWin ? "uvicorn.exe" : "uvicorn"
  )
  const venvReady = fs.existsSync(venvUvicorn)

  const url = new URL(request.url)
  const includeLogs = url.searchParams.get("logs") === "true"
  let recentLogs: string[] = []

  if (includeLogs && fs.existsSync(LOG_FILE)) {
    try {
      const content = fs.readFileSync(LOG_FILE, "utf-8")
      const allLines = content.split("\n").filter((l) => l.trim().length > 0)
      recentLogs = allLines.slice(-30)
    } catch {
      recentLogs = ["Error al leer el archivo de registros."]
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      isRunning,
      pid: savedPid,
      venvReady,
      port: AI_PORT,
      logs: includeLogs ? recentLogs : undefined,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await validateRole(["JEFE"])
  if (!auth.isValid) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || "start"

    if (action === "start") {
      // 1. Verificar si ya está corriendo o si otra aplicación ocupa el puerto
      const estado = await getAiPortState()
      if (estado === "ajeno") {
        return NextResponse.json(
          { success: false, error: MENSAJE_PUERTO_AJENO },
          { status: 409 }
        )
      }
      if (estado === "ok") {
        return NextResponse.json({
          success: true,
          message: "El motor de IA ya se encuentra en ejecución.",
          data: { isRunning: true, pid: getSavedPid() },
        })
      }

      // 2. Resolver comando y argumentos
      const { command, args } = resolveUvicornCommand()

      // 3. Asegurar carpeta de logs
      if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true })
      }
      const logFd = fs.openSync(LOG_FILE, "a")

      // Marca de tiempo en el log
      fs.writeSync(
        logFd,
        `\n[${new Date().toISOString()}] === INICIANDO MOTOR DE IA (PID pending) ===\nComando: ${command} ${args.join(" ")}\n`
      )

      // 4. Iniciar subproceso desacoplado
      const child = spawn(command, args, {
        cwd: process.cwd(),
        detached: true,
        stdio: ["ignore", logFd, logFd],
        windowsHide: true,
        shell: false,
      })

      const childPid = child.pid
      if (childPid) {
        savePid(childPid)
        fs.writeSync(logFd, `[${new Date().toISOString()}] Subproceso lanzado con PID: ${childPid}\n`)
      }

      child.unref()
      fs.closeSync(logFd)

      return NextResponse.json({
        success: true,
        message: "Microservicio de IA iniciado en segundo plano.",
        data: {
          pid: childPid,
          isRunning: true,
        },
      })
    }

    if (action === "stop") {
      const pid = getSavedPid()
      stopProcessTree(pid)

      return NextResponse.json({
        success: true,
        message: "Microservicio de IA detenido correctamente.",
        data: { isRunning: false },
      })
    }

    if (action === "restart") {
      const pid = getSavedPid()
      stopProcessTree(pid)

      // Breve pausa para liberar socket
      await new Promise((r) => setTimeout(r, 1200))

      const { command, args } = resolveUvicornCommand()
      if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true })
      }
      const logFd = fs.openSync(LOG_FILE, "a")
      const child = spawn(command, args, {
        cwd: process.cwd(),
        detached: true,
        stdio: ["ignore", logFd, logFd],
        windowsHide: true,
        shell: false,
      })
      if (child.pid) savePid(child.pid)
      child.unref()
      fs.closeSync(logFd)

      return NextResponse.json({
        success: true,
        message: "Microservicio de IA reiniciado en segundo plano.",
        data: { pid: child.pid, isRunning: true },
      })
    }

    return NextResponse.json(
      { success: false, error: `Acción '${action}' no reconocida` },
      { status: 400 }
    )
  } catch (error) {
    console.error("[AI Service API] Error al procesar acción:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al gestionar el servicio de IA",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    )
  }
}
