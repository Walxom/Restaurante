'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  autoConnect?: boolean
  room?: string
}

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  emit: (event: string, data?: any) => void
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true, room } = options
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const connect = () => {
    if (socketRef.current?.connected) {
      console.log('Socket ya está conectado')
      return
    }

    console.log('🔌 Conectando a Socket.IO...')
    const newSocket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('✅ Conectado a Socket.IO:', newSocket.id)
      setIsConnected(true)
      
      // Unirse automáticamente a la sala si se especifica
      if (room) {
        newSocket.emit('join_room', room)
      }
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Desconectado de Socket.IO:', reason)
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error)
      setIsConnected(false)
    })

    socketRef.current = newSocket
    setSocket(newSocket)
  }

  const disconnect = () => {
    if (socketRef.current) {
      console.log('🔌 Desconectando Socket.IO...')
      socketRef.current.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }

  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
      console.log(`📡 Evento '${event}' emitido:`, data)
    } else {
      console.warn('⚠️ Socket no conectado, no se puede emitir evento:', event)
    }
  }

  const joinRoom = (roomName: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_room', roomName)
      console.log(`🏠 Uniéndose a sala: ${roomName}`)
    }
  }

  const leaveRoom = (roomName: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_room', roomName)
      console.log(`🚪 Saliendo de sala: ${roomName}`)
    }
  }

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    // Cleanup al desmontar el componente
    return () => {
      disconnect()
    }
  }, [autoConnect])

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    joinRoom,
    leaveRoom
  }
}

// Hook específico para pedidos
export function useOrdersSocket(callbacks?: {
  onNewOrder?: (order: any) => void
  onOrderUpdated?: (order: any) => void
  onOrderStatusChanged?: (data: { orderId: string, status: string }) => void
  onOrderItemUpdate?: (data: { orderId: string, itemId: string, action: string, itemData: any }) => void
}) {
  const { socket, isConnected, ...rest } = useSocket({ 
    autoConnect: true, 
    room: 'orders' 
  })

  useEffect(() => {
    if (socket && callbacks) {
      console.log('Registrando eventos Socket.IO:', {
        hasNewOrder: !!callbacks.onNewOrder,
        hasOrderUpdated: !!callbacks.onOrderUpdated,
        hasOrderStatusChanged: !!callbacks.onOrderStatusChanged,
        hasOrderItemUpdate: !!callbacks.onOrderItemUpdate
      })
      
      // Registrar eventos cuando el socket esté disponible
      if (callbacks.onNewOrder) {
        socket.on('new_order', callbacks.onNewOrder)
      }
      if (callbacks.onOrderUpdated) {
        socket.on('order_updated', callbacks.onOrderUpdated)
      }
      if (callbacks.onOrderStatusChanged) {
        socket.on('order_status_changed', callbacks.onOrderStatusChanged)
      }
      if (callbacks.onOrderItemUpdate) {
        socket.on('order_item_updated', callbacks.onOrderItemUpdate)
      }

      // Cleanup al desmontar
      return () => {
        console.log('Limpiando eventos Socket.IO')
        if (callbacks.onNewOrder) {
          socket.off('new_order', callbacks.onNewOrder)
        }
        if (callbacks.onOrderUpdated) {
          socket.off('order_updated', callbacks.onOrderUpdated)
        }
        if (callbacks.onOrderStatusChanged) {
          socket.off('order_status_changed', callbacks.onOrderStatusChanged)
        }
        if (callbacks.onOrderItemUpdate) {
          socket.off('order_item_updated', callbacks.onOrderItemUpdate)
        }
      }
    }
  }, [socket])

  const onNewOrder = (callback: (order: any) => void) => {
    if (socket) {
      socket.on('new_order', callback)
      return () => socket.off('new_order', callback)
    }
  }

  const onOrderUpdate = (callback: (order: any) => void) => {
    if (socket) {
      socket.on('order_updated', callback)
      return () => socket.off('order_updated', callback)
    }
  }

  const onOrderStatusChange = (callback: (data: { orderId: string, status: string }) => void) => {
    if (socket) {
      socket.on('order_status_changed', callback)
      return () => socket.off('order_status_changed', callback)
    }
  }

  const onOrderItemUpdate = (callback: (data: { orderId: string, itemId: string, action: string, itemData: any }) => void) => {
    if (socket) {
      socket.on('order_item_updated', callback)
      return () => socket.off('order_item_updated', callback)
    }
  }

  return {
    socket,
    isConnected,
    onNewOrder,
    onOrderUpdate,
    onOrderStatusChange,
    onOrderItemUpdate,
    ...rest
  }
}