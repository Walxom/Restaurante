const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

// Cuando esté listo Next.js, creamos el servidor HTTP y Socket.IO
const app = next({ dev, hostname, port })

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
    console.log('🔌 Cliente conectado:', socket.id)

    // Unir automáticamente a la sala de pedidos
    socket.join('orders')
    console.log('📋 Cliente unido a sala de pedidos')

    // Manejar eventos personalizados
    socket.on('join_room', (room) => {
      socket.join(room)
      console.log(`🏠 Cliente ${socket.id} se unió a la sala: ${room}`)
    })

    socket.on('leave_room', (room) => {
      socket.leave(room)
      console.log(`🚪 Cliente ${socket.id} salió de la sala: ${room}`)
    })

    socket.on('disconnect', () => {
      console.log('❌ Cliente desconectado:', socket.id)
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
      console.log(`🚀 Servidor listo en http://${hostname}:${port}`)
      console.log(`🔌 Socket.IO listo en puerto ${port}`)

      // Se ha desactivado el inicio forzado. 
      // El inicio ahora es inteligente y basado en la base de datos.
      // await initializeThermalPrintService()
    })
})

// Función helper para emitir eventos
function emitToRoom(room, event, data) {
  if (global.io) {
    global.io.to(room).emit(event, data)
    console.log(`📡 Evento '${event}' emitido a sala '${room}':`, data)
  }
}

function emitToAll(event, data) {
  if (global.io) {
    global.io.emit(event, data)
    console.log(`📡 Evento '${event}' emitido a todos:`, data)
  }
}

module.exports = { emitToRoom, emitToAll }