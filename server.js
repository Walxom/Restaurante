const fs = require('fs')
const path = require('path')

// Cargar variables de entorno nativamente desde .env antes de inicializar Next.js
const envPath = path.resolve(__dirname, '.env')
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envPath)
    } catch {
      // Si falla process.loadEnvFile, Next.js lo intentará en app.prepare()
    }
  }
}

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const os = require('os')

// Asegurar que NODE_ENV esté explícitamente definido para evitar desalineación entre bundlers
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development'
}

const dev = process.env.NODE_ENV !== 'production'
// En dev escuchamos solo en localhost; en producción en todas las interfaces (LAN)
const hostname = dev ? 'localhost' : '0.0.0.0'
const port = process.env.PORT || 3001

// Si se inicia en modo dev y existe un BUILD_ID de producción previo en .next,
// limpiar para evitar colisiones ENOENT de manifiestos obsoletos entre Webpack y Turbopack
if (dev) {
  const buildIdFile = path.join(__dirname, '.next', 'BUILD_ID')
  if (fs.existsSync(buildIdFile)) {
    try {
      console.log('🧹 Limpiando artefactos de producción en .next para evitar colisiones de caché en dev...')
      fs.rmSync(path.join(__dirname, '.next'), { recursive: true, force: true })
    } catch {
      // Ignorar si el sistema de archivos retiene algún lock temporal
    }
  }
}

function getPrivateIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return 'localhost'
}

const app = next({ dev, hostname, port, turbopack: dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        res.statusCode = 404
        res.end('Not found')
        return
      }
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // CORS restringido: orígenes explícitos en ALLOWED_ORIGINS + rangos IPv4 privados (LAN)
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const isAllowedOrigin = (origin) => {
    if (!origin) return true // peticiones sin Origin (mismo host, curl, apps nativas)
    if (allowedOrigins.includes(origin)) return true
    return /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
      origin
    )
  }

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    if (dev) console.log('🔌 Cliente conectado:', socket.id)

    socket.join('orders')

    socket.on('join_room', (room) => socket.join(room))
    socket.on('leave_room', (room) => socket.leave(room))

    socket.on('disconnect', () => {
      if (dev) console.log('❌ Cliente desconectado:', socket.id)
    })
  })

  global.io = io

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, hostname, () => {
      if (dev) {
        console.log(`🚀 Servidor listo en http://${hostname}:${port} ⚡ (Turbopack)`)
        console.log(`🔌 Socket.IO listo en puerto ${port}`)
      } else {
        const privateIP = getPrivateIP()
        console.log(`🚀 Servidor listo en:`)
        console.log(`   • Local:       http://localhost:${port}`)
        console.log(`   • Red privada: http://${privateIP}:${port}`)
        console.log(`🔌 Socket.IO listo en puerto ${port}`)
      }
    })

  // Cierre ordenado (SIGTERM/SIGINT): deja de aceptar conexiones, cierra los
  // sockets y el servidor HTTP en vez de matar de golpe peticiones/escrituras
  // en curso (que podía dejar el WAL de SQLite sin checkpoint).
  const shutdown = (signal) => {
    console.log(`\n${signal} recibido. Cerrando servidor...`)
    const forceExit = setTimeout(() => {
      console.error('Cierre forzado tras timeout de 10s.')
      process.exit(1)
    }, 10000)
    if (typeof forceExit.unref === 'function') forceExit.unref()
    io.close(() => {
      httpServer.close(() => {
        console.log('Servidor cerrado limpiamente.')
        process.exit(0)
      })
    })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
})

function emitToRoom(room, event, data) {
  if (global.io) global.io.to(room).emit(event, data)
}

function emitToAll(event, data) {
  if (global.io) global.io.emit(event, data)
}

module.exports = { emitToRoom, emitToAll }
