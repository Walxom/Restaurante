import { Server as SocketIOServer } from 'socket.io'

// Función para establecer la instancia de Socket.IO (llamada desde server.js)
export function setSocketIO(server: SocketIOServer) {
  (global as any).io = server
}

// Función para obtener la instancia de Socket.IO
export function getSocketIO(): SocketIOServer | null {
  return (global as any).io || null
}

// Función para emitir eventos a una sala específica
export function emitToRoom(room: string, event: string, data: any) {
  const io = getSocketIO()
  if (io) {
    io.to(room).emit(event, data)
    console.log(`📡 Evento '${event}' emitido a sala '${room}':`, data)
  } else {
    console.warn(`⚠️ Socket.IO no disponible. Evento '${event}' no emitido a sala '${room}'`)
  }
}

// Función para emitir eventos a todos los clientes conectados
export function emitToAll(event: string, data: any) {
  const io = getSocketIO()
  if (io) {
    io.emit(event, data)
    console.log(`📡 Evento '${event}' emitido a todos:`, data)
  } else {
    console.warn(`⚠️ Socket.IO no disponible. Evento '${event}' no emitido`)
  }
}