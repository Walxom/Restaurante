import { Server as SocketIOServer } from 'socket.io'

// Almacenar la instancia del servidor Socket.IO
let io: SocketIOServer | null = null

// Función para establecer la instancia de Socket.IO
export function setSocketIO(server: SocketIOServer) {
  io = server
}

// Función para obtener la instancia de Socket.IO
export function getSocketIO(): SocketIOServer | null {
  return io
}

// Función para emitir eventos a una sala específica
export function emitToRoom(room: string, event: string, data: any) {
  if (io) {
    io.to(room).emit(event, data)
    console.log(`📡 Evento '${event}' emitido a sala '${room}':`, data)
  }
}

// Función para emitir eventos a todos los clientes conectados
export function emitToAll(event: string, data: any) {
  if (io) {
    io.emit(event, data)
    console.log(`📡 Evento '${event}' emitido a todos:`, data)
  }
}