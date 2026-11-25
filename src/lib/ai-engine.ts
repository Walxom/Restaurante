/**
 * URL base del motor de IA (FastAPI).
 *
 * - Instalación local: el motor corre en la misma máquina (127.0.0.1:AI_PORT).
 * - Docker Compose: AI_ENGINE_URL apunta al servicio `siger-ai` de la red interna.
 */
function sinBarraFinal(url: string): string {
  let fin = url.length
  while (fin > 0 && url[fin - 1] === "/") fin--
  return url.slice(0, fin)
}

export const AI_ENGINE_URL = sinBarraFinal(
  process.env.AI_ENGINE_URL || `http://127.0.0.1:${process.env.AI_PORT || 8000}`,
)
