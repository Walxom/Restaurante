import { describe, it, expect, vi, beforeEach } from "vitest"
import * as billingService from "../billing.service"

describe("Pruebas Unitarias de Camino Básico (Caja Blanca) — procesarPagoPedido", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Mockear por defecto las acciones físicas para evitar side-effects
    vi.spyOn(billingService.actions, "imprimirComprobanteFisico").mockResolvedValue(true)
    vi.spyOn(billingService.actions, "enviarReciboDigitalPorEmail").mockResolvedValue(true)
  })

  // ─── CAMINO 1: Excepción de Parámetros Inválidos ────────────────────────────
  describe("Camino 1: Excepción de Parámetros", () => {
    it("debe lanzar un error preventivo si el pedidoId está vacío", async () => {
      await expect(
        billingService.procesarPagoPedido("", 50.00, "EFECTIVO")
      ).rejects.toThrow("Parámetros transaccionales inválidos")
    })

    it("debe lanzar un error preventivo si el montoPagado es menor o igual a cero", async () => {
      await expect(
        billingService.procesarPagoPedido("pedido-123", 0, "EFECTIVO")
      ).rejects.toThrow("Parámetros transaccionales inválidos")

      await expect(
        billingService.procesarPagoPedido("pedido-123", -10.00, "EFECTIVO")
      ).rejects.toThrow("Parámetros transaccionales inválidos")
    })
  })

  // ─── CAMINO 2: Excepción de Estado de Pedido ────────────────────────────────
  describe("Camino 2: Excepción de Estado de Pedido", () => {
    it("debe lanzar un error si el pedido no existe en el sistema", async () => {
      // Mockear db.pedido.findUnique para retornar null (usuario inexistente)
      vi.spyOn(billingService.db.pedido, "findUnique").mockResolvedValue(null)

      await expect(
        billingService.procesarPagoPedido("pedido-no-existe", 50.00, "EFECTIVO")
      ).rejects.toThrow("El pedido no existe o ya ha sido cancelado/pagado")
    })

    it("debe lanzar un error si el pedido existe pero su estado no es PENDIENTE_PAGO", async () => {
      // Mockear db.pedido.findUnique para retornar un pedido ya pagado
      vi.spyOn(billingService.db.pedido, "findUnique").mockResolvedValue({
        id: "pedido-ya-pagado",
        estado: "PAGADO",
        total: 50.00,
        mesaId: "mesa-4",
      })

      await expect(
        billingService.procesarPagoPedido("pedido-ya-pagado", 50.00, "EFECTIVO")
      ).rejects.toThrow("El pedido no existe o ya ha sido cancelado/pagado")
    })
  })

  // ─── CAMINO 3: Excepción de Saldo Insuficiente ──────────────────────────────
  describe("Camino 3: Excepción de Saldo Insuficiente", () => {
    it("debe rechazar la transacción si el monto pagado es menor al total del pedido", async () => {
      // Mockear db.pedido.findUnique para retornar un pedido de S/ 50.00
      vi.spyOn(billingService.db.pedido, "findUnique").mockResolvedValue({
        id: "pedido-1",
        estado: "PENDIENTE_PAGO",
        total: 50.00,
        mesaId: "mesa-4",
      })

      await expect(
        billingService.procesarPagoPedido("pedido-1", 49.90, "EFECTIVO")
      ).rejects.toThrow("Monto pagado insuficiente")
    })
  })

  // ─── CAMINO 4: Cierre Exitoso con Efectivo e Impresión Física ────────────────
  describe("Camino 4: Cierre Exitoso con Efectivo", () => {
    it("debe completar el pago, calcular el vuelto correcto, actualizar la BD y disparar la ticketera", async () => {
      // 1. Mock de datos iniciales del pedido (Total: S/ 45.00)
      vi.spyOn(billingService.db.pedido, "findUnique").mockResolvedValue({
        id: "pedido-efectivo",
        estado: "PENDIENTE_PAGO",
        total: 45.00,
        mesaId: "mesa-2",
      })

      // 2. Mockear mutaciones de base de datos
      const updatePedidoSpy = vi.spyOn(billingService.db.pedido, "update").mockImplementation((args) => args as any)
      const updateMesaSpy = vi.spyOn(billingService.db.mesa, "update").mockImplementation((args) => args as any)
      const transactionSpy = vi.spyOn(billingService.db, "$transaction").mockResolvedValue([])

      // Spies de acciones físicas
      const printSpy = vi.spyOn(billingService.actions, "imprimirComprobanteFisico").mockResolvedValue(true)
      const emailSpy = vi.spyOn(billingService.actions, "enviarReciboDigitalPorEmail").mockResolvedValue(true)

      // 3. Ejecutar servicio (Monto pagado: S/ 50.00)
      const result = await billingService.procesarPagoPedido("pedido-efectivo", 50.00, "EFECTIVO")

      // 4. Verificaciones funcionales y matemáticas
      expect(result.success).toBe(true)
      expect(result.vuelto).toBe(5.00) // 50.00 - 45.00 = 5.00 vueltos

      // Verificar transaccionalidad ACID
      expect(updatePedidoSpy).toHaveBeenCalledWith({
        where: { id: "pedido-efectivo" },
        data: { estado: "PAGADO", metodoPago: "EFECTIVO" }
      })
      expect(updateMesaSpy).toHaveBeenCalledWith({
        where: { id: "mesa-2" },
        data: { estado: "LIBRE" }
      })
      expect(transactionSpy).toHaveBeenCalled()

      // Verificar que se haya impreso el ticket físico (Efectivo)
      expect(printSpy).toHaveBeenCalledWith("pedido-efectivo", 5.00)
      expect(emailSpy).not.toHaveBeenCalled()
    })
  })

  // ─── CAMINO 5: Cierre Exitoso con Pago Digital e Invalida Impresión ─────────
  describe("Camino 5: Cierre Exitoso con Pago Digital", () => {
    it("debe completar el pago, registrar la transacción digital, liberar la mesa y enviar correo electrónico", async () => {
      // 1. Mock de datos iniciales (Total: S/ 80.00)
      vi.spyOn(billingService.db.pedido, "findUnique").mockResolvedValue({
        id: "pedido-digital",
        estado: "PENDIENTE_PAGO",
        total: 80.00,
        mesaId: "mesa-5",
      })

      // 2. Mockear mutaciones y transacciones
      const updatePedidoSpy = vi.spyOn(billingService.db.pedido, "update").mockImplementation((args) => args as any)
      const updateMesaSpy = vi.spyOn(billingService.db.mesa, "update").mockImplementation((args) => args as any)
      const transactionSpy = vi.spyOn(billingService.db, "$transaction").mockResolvedValue([])

      // Spies de acciones físicas
      const printSpy = vi.spyOn(billingService.actions, "imprimirComprobanteFisico").mockResolvedValue(true)
      const emailSpy = vi.spyOn(billingService.actions, "enviarReciboDigitalPorEmail").mockResolvedValue(true)

      // 3. Ejecutar servicio (Monto pagado exacto: S/ 80.00 con YAPE)
      const result = await billingService.procesarPagoPedido("pedido-digital", 80.00, "YAPE")

      // 4. Verificaciones
      expect(result.success).toBe(true)
      expect(result.vuelto).toBe(0.00) // Pago exacto

      // Verificar transaccionalidad
      expect(updatePedidoSpy).toHaveBeenCalledWith({
        where: { id: "pedido-digital" },
        data: { estado: "PAGADO", metodoPago: "YAPE" }
      })
      expect(updateMesaSpy).toHaveBeenCalledWith({
        where: { id: "mesa-5" },
        data: { estado: "LIBRE" }
      })
      expect(transactionSpy).toHaveBeenCalled()

      // Verificar despacho digital (Email) en vez de físico (Ticketera)
      expect(emailSpy).toHaveBeenCalledWith("pedido-digital")
      expect(printSpy).not.toHaveBeenCalled()
    })
  })
})
