const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const path = require('path')
const os = require('os')

const dev = false // Forzar modo producción
const hostname = '0.0.0.0' // Escuchar en todas las interfaces
const port = process.env.PORT || 3001

// Función para obtener la IP privada
function getPrivateIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Buscar IPv4 no loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

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

  // Crear servidor Socket.IO con CORS más permisivo para producción
  const io = new Server(httpServer, {
    cors: {
      origin: true, // Permitir cualquier origen en producción local
      methods: ['GET', 'POST'],
      credentials: true
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
    .listen(port, hostname, async () => {
      const privateIP = getPrivateIP()
      console.log('🚀 ==========================================')
      console.log('🏭 SERVIDOR EN MODO PRODUCCIÓN')
      console.log('🚀 ==========================================')
      console.log(`🌐 Servidor accesible en:`)
      console.log(`   • Local: http://localhost:${port}`)
      console.log(`   • Red privada: http://${privateIP}:${port}`)
      console.log(`🔌 Socket.IO listo en puerto ${port}`)
      console.log('🚀 ==========================================')
      console.log('📱 Accede desde cualquier dispositivo en tu red local')
      console.log(`   usando la IP: ${privateIP}:${port}`)
      console.log('🚀 ==========================================')

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