/**
 * Formateador de Órdenes de Cocina para ZJ-8360
 * Especializado en tickets de preparación para cocina
 */

import { type KitchenOrderData, type KitchenItem } from '../drivers/ZJ8360NetworkDriver'

export interface KitchenFormattingOptions {
  showTimestamp: boolean
  showWaiter: boolean
  showTable: boolean
  includeQR: boolean
  priorityHighlight: boolean
  allergyWarnings: boolean
  doubleSize: boolean
  autoBeep: boolean
  paperWidth: 32 | 58 | 80 // caracteres por línea
}

export interface KitchenTicketTemplate {
  header: string
  footer: string
  separator: string
  priorityMarkers: {
    low: string
    normal: string
    high: string
    urgent: string
  }
}

export class KitchenOrderFormatter {
  private options: KitchenFormattingOptions
  private template: KitchenTicketTemplate

  constructor(
    options: Partial<KitchenFormattingOptions> = {},
    template: Partial<KitchenTicketTemplate> = {}
  ) {
    this.options = {
      showTimestamp: true,
      showWaiter: true,
      showTable: true,
      includeQR: false,
      priorityHighlight: true,
      allergyWarnings: true,
      doubleSize: false,
      autoBeep: true,
      paperWidth: 32,
      ...options
    }

    this.template = {
      header: '🍳 ORDEN DE COCINA 🍳',
      footer: 'Mr. Frit - Cocina',
      separator: '='.repeat(this.options.paperWidth),
      priorityMarkers: {
        low: '🟢',
        normal: '🔵',
        high: '🟡',
        urgent: '🔴'
      },
      ...template
    }
  }

  /**
   * Formatear orden completa para impresión
   */
  formatOrder(orderData: KitchenOrderData): string {
    const lines: string[] = []

    // 1. Header
    lines.push(this.formatHeader(orderData))
    
    // 2. Información de la orden
    lines.push(this.formatOrderInfo(orderData))
    
    // 3. Items de preparación
    lines.push(this.formatItems(orderData.items))
    
    // 4. Notas especiales
    if (orderData.notes) {
      lines.push(this.formatNotes(orderData.notes))
    }
    
    // 5. Footer
    lines.push(this.formatFooter(orderData))

    return lines.join('\n')
  }

  /**
   * Formatear header con prioridad
   */
  private formatHeader(orderData: KitchenOrderData): string {
    const lines: string[] = []
    
    // Título principal
    lines.push(this.centerText(this.template.header))
    
    // Indicador de prioridad
    if (this.options.priorityHighlight && orderData.priority !== 'normal') {
      const marker = this.template.priorityMarkers[orderData.priority]
      const priorityText = `${marker} ${orderData.priority.toUpperCase()} ${marker}`
      lines.push(this.centerText(priorityText))
    }
    
    lines.push(this.template.separator)
    
    return lines.join('\n')
  }

  /**
   * Formatear información de la orden
   */
  private formatOrderInfo(orderData: KitchenOrderData): string {
    const lines: string[] = []
    
    // Número de orden (siempre visible)
    lines.push(`Orden: #${orderData.orderNumber}`)
    
    // Mesa (si está disponible)
    if (this.options.showTable && orderData.tableNumber) {
      lines.push(`Mesa: ${orderData.tableNumber}`)
    }
    
    // Mesero (si está disponible)
    if (this.options.showWaiter && orderData.waiterName) {
      lines.push(`Mesero: ${orderData.waiterName}`)
    }
    
    // Timestamp
    if (this.options.showTimestamp) {
      const timeString = orderData.timestamp.toLocaleTimeString('es-PE', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
      lines.push(`Hora: ${timeString}`)
    }
    
    lines.push('-'.repeat(this.options.paperWidth))
    
    return lines.join('\n')
  }

  /**
   * Formatear items de preparación
   */
  private formatItems(items: KitchenItem[]): string {
    const lines: string[] = []
    
    lines.push('PLATOS A PREPARAR:')
    lines.push('-'.repeat(this.options.paperWidth))
    
    items.forEach((item, index) => {
      // Nombre y cantidad del plato
      const itemLine = `${item.quantity}x ${item.name}`
      lines.push(itemLine)
      
      // Modificaciones
      if (item.modifications && item.modifications.length > 0) {
        const modText = this.wrapText(`Mod: ${item.modifications.join(', ')}`, '  ')
        lines.push(modText)
      }
      
      // Instrucciones de cocción
      if (item.cookingInstructions) {
        const instructionText = this.wrapText(`Prep: ${item.cookingInstructions}`, '  ')
        lines.push(instructionText)
      }
      
      // Advertencias de alergia (destacadas)
      if (this.options.allergyWarnings && item.allergyWarnings && item.allergyWarnings.length > 0) {
        const allergyText = `⚠️ ALERGIA: ${item.allergyWarnings.join(', ')}`
        lines.push(this.wrapText(allergyText, '  '))
      }
      
      // Separador entre items (excepto el último)
      if (index < items.length - 1) {
        lines.push('')
      }
    })
    
    return lines.join('\n')
  }

  /**
   * Formatear notas especiales
   */
  private formatNotes(notes: string): string {
    const lines: string[] = []
    
    lines.push(this.template.separator)
    lines.push('NOTAS ESPECIALES:')
    lines.push(this.wrapText(notes))
    
    return lines.join('\n')
  }

  /**
   * Formatear footer
   */
  private formatFooter(orderData: KitchenOrderData): string {
    const lines: string[] = []
    
    // Separador final
    lines.push(this.template.separator)
    
    // QR Code placeholder (si está habilitado)
    if (this.options.includeQR) {
      lines.push(this.centerText(`[QR: ORDER:${orderData.orderNumber}]`))
    }
    
    // Footer del restaurante
    lines.push(this.centerText(this.template.footer))
    
    // Fecha actual
    const dateString = new Date().toLocaleDateString('es-PE')
    lines.push(this.centerText(dateString))
    
    return lines.join('\n')
  }

  /**
   * Centrar texto según el ancho del papel
   */
  private centerText(text: string): string {
    const padding = Math.max(0, Math.floor((this.options.paperWidth - text.length) / 2))
    return ' '.repeat(padding) + text
  }

  /**
   * Ajustar texto a ancho específico con prefijo
   */
  private wrapText(text: string, prefix: string = ''): string {
    const maxWidth = this.options.paperWidth - prefix.length
    
    if (text.length <= maxWidth) {
      return prefix + text
    }
    
    const lines: string[] = []
    let currentLine = ''
    const words = text.split(' ')
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word
      } else {
        if (currentLine) {
          lines.push(prefix + currentLine)
          currentLine = word
        } else {
          // Palabra muy larga, cortarla
          lines.push(prefix + word.substring(0, maxWidth))
          currentLine = word.substring(maxWidth)
        }
      }
    }
    
    if (currentLine) {
      lines.push(prefix + currentLine)
    }
    
    return lines.join('\n')
  }

  /**
   * Generar resumen de orden para cocina
   */
  formatOrderSummary(orderData: KitchenOrderData): string {
    const totalItems = orderData.items.reduce((sum, item) => sum + item.quantity, 0)
    const priorityIndicator = this.template.priorityMarkers[orderData.priority]
    
    return [
      `${priorityIndicator} #${orderData.orderNumber}`,
      `Mesa: ${orderData.tableNumber || 'N/A'}`,
      `Items: ${totalItems}`,
      `Hora: ${orderData.timestamp.toLocaleTimeString('es-PE', { hour12: false })}`
    ].join(' | ')
  }

  /**
   * Formatear solo los items principales (vista reducida)
   */
  formatItemsOnly(items: KitchenItem[]): string {
    return items.map(item => {
      let line = `${item.quantity}x ${item.name}`
      
      if (item.modifications && item.modifications.length > 0) {
        line += ` (${item.modifications.join(', ')})`
      }
      
      if (item.allergyWarnings && item.allergyWarnings.length > 0) {
        line += ` ⚠️ ${item.allergyWarnings.join(', ')}`
      }
      
      return line
    }).join('\n')
  }

  /**
   * Validar si una orden necesita atención especial
   */
  requiresSpecialAttention(orderData: KitchenOrderData): boolean {
    // Prioridad alta o urgente
    if (orderData.priority === 'high' || orderData.priority === 'urgent') {
      return true
    }
    
    // Tiene alergias
    if (this.options.allergyWarnings) {
      const hasAllergies = orderData.items.some(item => 
        item.allergyWarnings && item.allergyWarnings.length > 0
      )
      if (hasAllergies) return true
    }
    
    // Muchas modificaciones especiales
    const hasComplexModifications = orderData.items.some(item =>
      (item.modifications && item.modifications.length > 2) ||
      (item.cookingInstructions && item.cookingInstructions.length > 50)
    )
    
    return hasComplexModifications
  }

  /**
   * Actualizar opciones de formateo
   */
  updateOptions(newOptions: Partial<KitchenFormattingOptions>): void {
    this.options = { ...this.options, ...newOptions }
    
    // Recalcular separador si cambió el ancho
    if (newOptions.paperWidth) {
      this.template.separator = '='.repeat(newOptions.paperWidth)
    }
  }

  /**
   * Obtener estadísticas de la orden
   */
  getOrderStats(orderData: KitchenOrderData) {
    const totalItems = orderData.items.reduce((sum, item) => sum + item.quantity, 0)
    const itemsWithModifications = orderData.items.filter(item => 
      item.modifications && item.modifications.length > 0
    ).length
    const itemsWithAllergies = orderData.items.filter(item =>
      item.allergyWarnings && item.allergyWarnings.length > 0
    ).length

    return {
      totalItems,
      itemsWithModifications,
      itemsWithAllergies,
      requiresSpecialAttention: this.requiresSpecialAttention(orderData),
      estimatedPrintLines: this.formatOrder(orderData).split('\n').length
    }
  }
}
