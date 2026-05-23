const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

// En dev activamos Turbopack para compilaciones hasta 10x más rápidas
const app = next({
  dev,
  hostname,
  port,
  // Turbopack solo aplica en desarrollo; en producción se ignora esta opción
  turbopack: dev,
})

const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Crear servidor Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3001' : process.env.NEXTAUTH_URL,
      methods: ['GET', 'POST']
    }
  })

  // Manejar conexiones Socket.IO
  io.on('connection', (socket) => {
    // Solo logueamos conexiones en desarrollo para no saturar la consola
    if (dev) {
      console.log('🔌 Cliente conectado:', socket.id)
    }

    // Unir automáticamente a la sala de pedidos
    socket.join('orders')

    socket.on('join_room', (room) => {
      socket.join(room)
    })

    socket.on('leave_room', (room) => {
      socket.leave(room)
    })

    socket.on('disconnect', () => {
      if (dev) {
        console.log('❌ Cliente desconectado:', socket.id)
      }
    })
  })

  // Hacer que io esté disponible globalmente
  global.io = io

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, async () => {
      const turboMsg = dev ? ' ⚡ (Turbopack)' : ''
      console.log(`🚀 Servidor listo en http://${hostname}:${port}${turboMsg}`)
      console.log(`🔌 Socket.IO listo en puerto ${port}`)
    })
})

// Función helper para emitir eventos
function emitToRoom(room, event, data) {
  if (global.io) {
    global.io.to(room).emit(event, data)
  }
}

function emitToAll(event, data) {
  if (global.io) {
    global.io.emit(event, data)
  }
}

module.exports = { emitToRoom, emitToAll }