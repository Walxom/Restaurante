import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// SQLite local-first sobre LAN: con varios meseros escribiendo a la vez (pedidos
// + facturas) el modo por defecto puede devolver SQLITE_BUSY → 500.
// - connection_limit=1 fuerza un único escritor en el pool de Prisma, evitando
//   contención interna entre handlers concurrentes.
// - busy_timeout (abajo) hace que una escritura ESPERE hasta 5s por un lock en
//   vez de fallar al instante (p.ej. cuando el motor IA tiene la BD abierta).
// - journal_mode=WAL: las lecturas (dashboard, motor IA) no bloquean las
//   escrituras de pedidos y cobros. El motor IA abre la BD con ?mode=ro y SQLite
//   (≥ 3.22) permite leer en solo-lectura una BD en WAL; se comprobó con y sin un
//   escritor abierto. synchronous se deja en FULL (valor por defecto) para que una
//   venta confirmada no se pierda ante un corte de luz.
// Garantizar fallback seguro de DATABASE_URL si no se cargó el archivo .env
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db'
}

function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db'
  if (url.includes('connection_limit')) return url
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
    // Log detallado sólo en desarrollo; en test y producción sólo errores
    // (evita ruido de `prisma:query` en la salida de las pruebas).
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Aplicar WAL y busy_timeout una vez por proceso. Con connection_limit=1 basta una
// conexión, así que el PRAGMA cubre todas las consultas posteriores.
// Fire-and-forget: un fallo aquí no debe impedir importar el cliente.
// PRAGMA busy_timeout=N devuelve una fila, por eso se usa $queryRawUnsafe
// (no $executeRawUnsafe, que espera un statement sin resultados).
// Guardado a servidor: este módulo se arrastra al bundle del cliente vía un
// import indebido (useSystemConfig → system.service → prisma); ejecutar una
// query en el navegador lanza "PrismaClient is unable to run in this browser".
if (typeof window === 'undefined') {
  prisma
    .$queryRawUnsafe('PRAGMA journal_mode = WAL')
    .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000'))
    .catch((e) => console.error('No se pudieron aplicar los PRAGMA de SQLite:', e))
}
