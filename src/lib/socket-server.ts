import type { Server as SocketIOServer } from 'socket.io'

const globalForSocket = globalThis as unknown as { io: SocketIOServer | undefined }

export function setSocketIO(server: SocketIOServer) {
  globalForSocket.io = server
}

export function getSocketIO(): SocketIOServer | null {
  return globalForSocket.io ?? null
}

export function emitToRoom(room: string, event: string, data: unknown) {
  const io = getSocketIO()
  if (io) {
    io.to(room).emit(event, data)
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(`⚠️ Socket.IO no disponible. Evento '${event}' no emitido a sala '${room}'`)
  }
}

export function emitToAll(event: string, data: unknown) {
  const io = getSocketIO()
  if (io) {
    io.emit(event, data)
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(`⚠️ Socket.IO no disponible. Evento '${event}' no emitido`)
  }
}
