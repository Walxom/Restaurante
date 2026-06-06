import { type NextRequest } from 'next/server'
import { type Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { type Socket as NetSocket } from 'net'
import { setSocketIO } from '@/lib/socket-server'

interface SocketServer extends NetServer {
  io?: SocketIOServer | undefined
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends Response {
  socket: SocketWithIO
}

export async function GET(req: NextRequest) {
  const res = new Response() as unknown as NextApiResponseWithSocket
  
  if (!res.socket.server.io) {
    console.log('Inicializando servidor Socket.IO...')
    
    const httpServer: SocketServer = res.socket.server as any
    const io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : process.env.NEXTAUTH_URL,
        methods: ['GET', 'POST']
      }
    })
    
    res.socket.server.io = io
    setSocketIO(io)
    
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
    
    console.log('✅ Servidor Socket.IO inicializado')
  } else {
    console.log('ℹ️ Socket.IO ya está inicializado')
    setSocketIO(res.socket.server.io)
  }
  
  return new Response('Socket.IO server initialized', { status: 200 })
}