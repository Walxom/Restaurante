/**
 * URL base del motor de IA (FastAPI).
 *
 * - Instalación local: el motor corre en la misma máquina (127.0.0.1:AI_PORT).
 * - Docker Compose: AI_ENGINE_URL apunta al servicio `siger-ai` de la red interna.
 */
export const AI_ENGINE_URL = (
  process.env.AI_ENGINE_URL || `http://127.0.0.1:${process.env.AI_PORT || 8000}`
).replace(/\/+$/, "")
