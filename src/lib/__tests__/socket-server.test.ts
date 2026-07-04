import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setSocketIO, getSocketIO, emitToRoom, emitToAll } from '@/lib/socket-server'

function makeMockIo() {
  const roomEmit = vi.fn()
  const to = vi.fn().mockReturnValue({ emit: roomEmit })
  const ioEmit = vi.fn()
  // Sólo necesitamos la forma que usa socket-server (to().emit y emit)
  const io = { to, emit: ioEmit } as unknown as Parameters<typeof setSocketIO>[0]
  return { io, to, roomEmit, ioEmit }
}

describe('socket-server (servicio WebSocket)', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { io: unknown }).io = undefined
  })

  it('setSocketIO registra y getSocketIO devuelve la instancia', () => {
    const { io } = makeMockIo()
    setSocketIO(io)
    expect(getSocketIO()).toBe(io)
  })

  it('getSocketIO devuelve null cuando no hay servidor', () => {
    expect(getSocketIO()).toBeNull()
  })

  it('emitToRoom emite el evento a la sala indicada', () => {
    const { io, to, roomEmit } = makeMockIo()
    setSocketIO(io)
    emitToRoom('orders', 'new_order', { id: '1' })
    expect(to).toHaveBeenCalledWith('orders')
    expect(roomEmit).toHaveBeenCalledWith('new_order', { id: '1' })
  })

  it('emitToAll emite el evento globalmente', () => {
    const { io, ioEmit } = makeMockIo()
    setSocketIO(io)
    emitToAll('order_status_changed', { x: 1 })
    expect(ioEmit).toHaveBeenCalledWith('order_status_changed', { x: 1 })
  })

  it('no lanza error si el servidor Socket.IO no está disponible', () => {
    // Sin servidor, los helpers sólo advierten por consola; silenciamos ese
    // warn esperado para no ensuciar la salida de las pruebas.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(globalThis as unknown as { io: unknown }).io = undefined
    expect(() => emitToRoom('orders', 'evento', {})).not.toThrow()
    expect(() => emitToAll('evento', {})).not.toThrow()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
