/**
 * Comandos ESC/POS para Impresora Térmica YX-KW58-8002
 * Puerto: COM7 | Baudrate: 115200 | Ancho: 32 caracteres
 */

// Comandos básicos
export const ESC_POS = {
  // Inicialización
  INIT: '\x1B\x40',
  
  // Formato de texto
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  
  // Tamaños de fuente
  SIZE_NORMAL: '\x1B\x21\x00',
  SIZE_DOUBLE_HEIGHT: '\x1B\x21\x10',
  SIZE_DOUBLE_WIDTH: '\x1B\x21\x20',
  SIZE_DOUBLE_BOTH: '\x1B\x21\x30',
  
  // Alineación
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  
  // Control de papel
  FEED_LINE: '\x0A',
  FEED_LINES: (n: number) => '\x1B\x64' + String.fromCharCode(n),
  FEED_DOTS: (n: number) => '\x1B\x4A' + String.fromCharCode(n),
  
  // Corte de papel
  CUT_FULL: '\x1D\x56\x00',
  CUT_PARTIAL: '\x1D\x56\x01',
  
  // Códigos QR
  QR_MODEL: '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00',
  QR_SIZE: (size: number) => '\x1D\x28\x6B\x03\x00\x31\x43' + String.fromCharCode(size),
  QR_ERROR_CORRECTION: '\x1D\x28\x6B\x03\x00\x31\x45\x30',
  QR_PRINT: '\x1D\x28\x6B\x03\x00\x31\x51\x30',
  
  // Códigos de barras
  BARCODE_HEIGHT: (h: number) => '\x1D\x68' + String.fromCharCode(h),
  BARCODE_WIDTH: (w: number) => '\x1D\x77' + String.fromCharCode(w),
  BARCODE_TEXT_BELOW: '\x1D\x48\x02',
  BARCODE_CODE128: '\x1D\x6B\x49',
  
  // Efectos especiales
  INVERT_ON: '\x1D\x42\x01',
  INVERT_OFF: '\x1D\x42\x00',
  
  // Espaciado
  LINE_SPACING_DEFAULT: '\x1B\x32',
  LINE_SPACING_CUSTOM: (n: number) => '\x1B\x33' + String.fromCharCode(n),
  
  // Tabla de caracteres
  CHARSET_PC437: '\x1B\x74\x00',
  
  // Comandos para imprimir imágenes
  IMAGE_DOWNLOAD: '\x1D\x2A', // Descargar imagen bitmap
  IMAGE_PRINT: '\x1D\x2F', // Imprimir imagen
}

// Caracteres especiales disponibles
export const SPECIAL_CHARS = {
  LIGHT_SHADE: '\xB0',
  MEDIUM_SHADE: '\xB1',
  DARK_SHADE: '\xB2',
  FULL_BLOCK: '\xDB',
  LOWER_HALF: '\xDC',
  UPPER_HALF: '\xDD',
  HORIZONTAL_LINE: '\xC4',
  DOUBLE_LINE: '\xCD',
}

// Utilidades para formateo
export class ThermalPrinterUtils {
  static readonly LINE_WIDTH = 32

  /**
   * Crear línea de separación
   */
  static createLine(char: string = '=', length: number = this.LINE_WIDTH): string {
    return char.repeat(length) + '\n'
  }

  /**
   * Formatear título centrado
   */
  static formatTitle(text: string): string {
    const padding = Math.max(0, Math.floor((this.LINE_WIDTH - text.length) / 2))
    return ' '.repeat(padding) + text + '\n'
  }

  /**
   * Formatear precio alineado a la derecha
   */
  static formatPrice(label: string, price: number, currency: string = 'S/'): string {
    const safeLabel = label || ''
    const safePrice = price || 0
    const priceText = `${currency} ${safePrice.toFixed(2)}`
    const totalLength = safeLabel.length + priceText.length
    const padding = Math.max(1, this.LINE_WIDTH - totalLength)
    return safeLabel + ' '.repeat(padding) + priceText + '\n'
  }

  /**
   * Formatear línea de producto
   */
  static formatProduct(name: string, qty: number, price: number): string {
    const safeName = name || 'Producto'
    const safeQty = qty || 0
    const safePrice = price || 0
    
    const qtyText = `${safeQty}x`
    const priceText = `S/ ${safePrice.toFixed(2)}`
    
    // Calcular espacio disponible para el nombre
    const availableSpace = this.LINE_WIDTH - qtyText.length - priceText.length - 2
    const truncatedName = safeName.length > availableSpace ? 
      safeName.substring(0, availableSpace - 3) + '...' : safeName
    
    const padding = this.LINE_WIDTH - qtyText.length - truncatedName.length - priceText.length
    return qtyText + ' ' + truncatedName + ' '.repeat(Math.max(1, padding)) + priceText + '\n'
  }

  /**
   * Crear código QR
   */
  static createQR(data: string, size: number = 5): string {
    const dataLength = data.length
    const lengthBytes = String.fromCharCode(dataLength % 256) + String.fromCharCode(Math.floor(dataLength / 256))
    
    return ESC_POS.QR_MODEL +
           ESC_POS.QR_SIZE(size) +
           ESC_POS.QR_ERROR_CORRECTION +
           '\x1D\x28\x6B' + String.fromCharCode(dataLength + 3) + '\x00\x31\x50\x30' + data +
           ESC_POS.QR_PRINT
  }

  /**
   * Crear código de barras CODE128
   */
  static createBarcode128(data: string): string {
    return ESC_POS.BARCODE_HEIGHT(80) +
           ESC_POS.BARCODE_WIDTH(2) +
           ESC_POS.BARCODE_TEXT_BELOW +
           ESC_POS.BARCODE_CODE128 +
           String.fromCharCode(data.length) +
           data
  }

  /**
   * Limpiar texto para impresora (sin tildes)
   */
  static cleanText(text: string | undefined | null): string {
    if (!text || typeof text !== 'string') {
      return ''
    }
    
    return text
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[ÁÀÄÂ]/g, 'A')
      .replace(/[ÉÈËÊ]/g, 'E')
      .replace(/[ÍÌÏÎ]/g, 'I')
      .replace(/[ÓÒÖÔ]/g, 'O')
      .replace(/[ÚÙÜÛ]/g, 'U')
      .replace(/[Ñ]/g, 'N')
      .replace(/[Ç]/g, 'C')
  }

  /**
   * Formatear fecha y hora
   */
  static formatDateTime(date: Date): { date: string, time: string } {
    return {
      date: date.toLocaleDateString('es-PE'),
      time: date.toLocaleTimeString('es-PE', { hour12: false })
    }
  }

  /**
   * Crear comando para imprimir logo BMP (centrado)
   * TEMPORAL: Deshabilitado hasta configurar logo en memoria NV de impresora
   */
  static createLogoBMP(logoPath?: string): string {
    // SOLUCIÓN TEMPORAL: Retornar cadena vacía para evitar error "no NVLogo PIC"
    // Esto fuerza el uso del nombre de la empresa en lugar del logo inexistente
    console.log('🖼️ Logo NV deshabilitado temporalmente - usando nombre de empresa', { logoPath })
    return ''
    
    // CÓDIGO ORIGINAL (comentado hasta configurar logo NV):
    // Si no se proporciona un logo, devolver cadena vacía
    // if (!logoPath) {
    //   return ''
    // }
    
    // Para impresoras ESC/POS, necesitamos un comando especial para imprimir imágenes
    // Esto requiere que el logo esté en formato compatible con la impresora
    // Por simplicidad, vamos a usar un comando de referencia de logo NV (Non-Volatile memory)
    
    // Comando para imprimir logo desde memoria no volátil (NV Graphics)
    // Asumimos que el logo ya está cargado en la impresora como Logo 1
    // return ESC_POS.ALIGN_CENTER + 
    //        '\x1C\x70\x01\x30' + // Comando para imprimir NV Logo 1 (tamaño normal)
    //        ESC_POS.FEED_LINE + 
    //        ESC_POS.ALIGN_LEFT
  }

  /**
   * Crear encabezado con logo (reemplaza al nombre de empresa si hay logo disponible)
   * Actualmente usa nombre de empresa debido a logo NV deshabilitado
   */
  static createHeaderWithLogo(companyName: string, companyRuc?: string, companyAddress?: string, companyPhone?: string): string {
    let header = ESC_POS.INIT + ESC_POS.CHARSET_PC437

    // Intentar imprimir el logo desde memoria NV de la impresora
    const logoCommand = this.createLogoBMP('logo.bmp')
    
    if (logoCommand) {
      // Si hay logo, lo imprimimos centrado en lugar del nombre de la empresa
      console.log('🖼️ Usando logo NV en lugar del nombre de empresa')
      header += logoCommand
    } else {
      // Si no hay logo, usar el nombre de la empresa (comportamiento actual)
      console.log('🏢 Usando nombre de empresa:', companyName)
      header += ESC_POS.ALIGN_CENTER + ESC_POS.BOLD_ON + ESC_POS.SIZE_DOUBLE_BOTH
      header += ThermalPrinterUtils.cleanText(companyName) + '\n'
      header += ESC_POS.SIZE_NORMAL + ESC_POS.BOLD_OFF
    }
    
    // Información adicional de la empresa (siempre se muestra)
    if (companyRuc) {
      header += ESC_POS.ALIGN_CENTER + `RUC: ${companyRuc}\n`
    }
    if (companyAddress) {
      header += ESC_POS.ALIGN_CENTER + ThermalPrinterUtils.cleanText(companyAddress) + '\n'
    }
    if (companyPhone) {
      header += ESC_POS.ALIGN_CENTER + `Tel: ${companyPhone}\n`
    }
    
    header += ESC_POS.ALIGN_LEFT
    return header
  }
}

// Plantillas de documentos
export class ReceiptTemplates {
  /**
   * Generar boleta térmica
   */
  static generateReceipt(data: {
    companyName: string
    companyRuc?: string
    companyAddress?: string
    companyPhone?: string
    orderNumber: string
    date: Date
    customerName?: string
    customerDni?: string
    table?: string
    items: Array<{
      name: string
      quantity: number
      unitPrice: number
      total: number
    }>
    subtotal?: number
    igv?: number
    total: number
    notes?: string
  }): string {
    const { date, time } = ThermalPrinterUtils.formatDateTime(data.date)
    
    // Usar encabezado con logo (actualmente usa nombre de empresa)
    // NOTA: Logo NV temporalmente deshabilitado para evitar error "no NVLogo PIC"
    let receipt = ThermalPrinterUtils.createHeaderWithLogo(
      data.companyName, 
      data.companyRuc, 
      data.companyAddress, 
      data.companyPhone
    )
    
    receipt += ThermalPrinterUtils.createLine('=')

    // Información del documento
    receipt += ESC_POS.BOLD_ON + 'BOLETA DE VENTA\n' + ESC_POS.BOLD_OFF
    receipt += `Pedido: #${data.orderNumber}\n`
    receipt += `Fecha: ${date}\n`
    receipt += `Hora: ${time}\n`
    
    if (data.table) {
      receipt += `Mesa: ${data.table}\n`
    }
    if (data.customerName) {
      receipt += `Cliente: ${ThermalPrinterUtils.cleanText(data.customerName)}\n`
    }
    if (data.customerDni) {
      receipt += `DNI: ${data.customerDni}\n`
    }

    receipt += ThermalPrinterUtils.createLine('-')

    // Items
    receipt += ESC_POS.BOLD_ON + 'CANT DESCRIPCION        TOTAL\n' + ESC_POS.BOLD_OFF
    receipt += ThermalPrinterUtils.createLine('-')

    data.items.forEach(item => {
      receipt += ThermalPrinterUtils.formatProduct(
        ThermalPrinterUtils.cleanText(item.name),
        item.quantity,
        item.total
      )
    })

    receipt += ThermalPrinterUtils.createLine('-')

    // Totales (mostrar IGV si disponible)
    if (typeof data.subtotal === 'number' && typeof data.igv === 'number') {
      receipt += ThermalPrinterUtils.formatPrice('Subtotal:', data.subtotal)
      receipt += ThermalPrinterUtils.formatPrice('IGV:', data.igv)
      receipt += ThermalPrinterUtils.createLine('-')
    }
    receipt += ESC_POS.BOLD_ON + ESC_POS.SIZE_DOUBLE_HEIGHT
    receipt += ThermalPrinterUtils.formatPrice('TOTAL:', data.total)
    receipt += ESC_POS.SIZE_NORMAL + ESC_POS.BOLD_OFF

    // Notas
    if (data.notes) {
      receipt += ThermalPrinterUtils.createLine('-')
      receipt += 'Notas:\n'
      receipt += ThermalPrinterUtils.cleanText(data.notes) + '\n'
    }

    // QR Code (opcional)
    receipt += '\n' + ESC_POS.ALIGN_CENTER
    receipt += ThermalPrinterUtils.createQR(`https://mrfrit.com/boleta/${data.orderNumber}`)
    receipt += ESC_POS.ALIGN_LEFT

    // Pie de página
    receipt += '\n' + ESC_POS.ALIGN_CENTER
    receipt += ThermalPrinterUtils.cleanText('Gracias por su preferencia!\n')
    receipt += ThermalPrinterUtils.cleanText('Vuelva pronto\n')
    receipt += ESC_POS.ALIGN_LEFT

    // Corte final
    receipt += '\n\n\n' + ESC_POS.CUT_FULL

    return receipt
  }

  /**
   * Generar PRE-BOLETA térmica (sin Pedido #, sin QR, sin Notas)
   */
  static generatePreReceipt(data: {
    companyName: string
    companyRuc?: string
    companyAddress?: string
    companyPhone?: string
    date: Date
    customerName?: string
    table?: string
    items: Array<{
      name: string
      quantity: number
      unitPrice: number
      total: number
    }>
    total: number
  }): string {
    const { date, time } = ThermalPrinterUtils.formatDateTime(data.date)
    
    let receipt = ThermalPrinterUtils.createHeaderWithLogo(
      data.companyName, 
      data.companyRuc, 
      data.companyAddress, 
      data.companyPhone
    )
    
    receipt += ThermalPrinterUtils.createLine('=')

    // Título de documento
    receipt += ESC_POS.BOLD_ON + 'PRE-BOLETA\n' + ESC_POS.BOLD_OFF
    receipt += `Fecha: ${date}\n`
    receipt += `Hora: ${time}\n`
    
    if (data.table) {
      receipt += `Mesa: ${data.table}\n`
    }
    if (data.customerName) {
      receipt += `Cliente: ${ThermalPrinterUtils.cleanText(data.customerName)}\n`
    }

    receipt += ThermalPrinterUtils.createLine('-')

    // Items
    receipt += ESC_POS.BOLD_ON + 'CANT DESCRIPCION        TOTAL\n' + ESC_POS.BOLD_OFF
    receipt += ThermalPrinterUtils.createLine('-')

    data.items.forEach(item => {
      receipt += ThermalPrinterUtils.formatProduct(
        ThermalPrinterUtils.cleanText(item.name),
        item.quantity,
        item.total
      )
    })

    receipt += ThermalPrinterUtils.createLine('-')

    // Total
    receipt += ESC_POS.ALIGN_RIGHT + ESC_POS.BOLD_ON + ESC_POS.SIZE_DOUBLE_HEIGHT
    receipt += `TOTAL: S/ ${data.total.toFixed(2)}\n`
    receipt += ESC_POS.SIZE_NORMAL + ESC_POS.BOLD_OFF + ESC_POS.ALIGN_LEFT

    // Corte final
    receipt += '\n\n\n' + ESC_POS.CUT_FULL

    return receipt
  }

  /**
   * Generar factura térmica
   */
  static generateInvoice(data: {
    companyName: string
    companyRuc?: string
    companyAddress?: string
    companyPhone?: string
    invoiceNumber: string
    orderNumber: string
    date: Date
    customerName: string
    customerRuc: string
    table?: string
    items: Array<{
      name: string
      quantity: number
      unitPrice: number
      total: number
    }>
    subtotal: number
    tax: number
    total: number
    notes?: string
  }): string {
    const { date, time } = ThermalPrinterUtils.formatDateTime(data.date)
    
    // Usar encabezado con logo (actualmente usa nombre de empresa)  
    // NOTA: Logo NV temporalmente deshabilitado para evitar error "no NVLogo PIC"
    let invoice = ThermalPrinterUtils.createHeaderWithLogo(
      data.companyName, 
      data.companyRuc, 
      data.companyAddress, 
      data.companyPhone
    )
    
    invoice += ThermalPrinterUtils.createLine('=')

    // Información del documento
    invoice += ESC_POS.BOLD_ON + 'FACTURA ELECTRONICA\n' + ESC_POS.BOLD_OFF
    invoice += `N°: ${data.invoiceNumber}\n`
    invoice += `Pedido: #${data.orderNumber}\n`
    invoice += `Fecha: ${date}\n`
    invoice += `Hora: ${time}\n`

    invoice += ThermalPrinterUtils.createLine('-')

    // Datos del cliente
    invoice += ESC_POS.BOLD_ON + 'DATOS DEL CLIENTE\n' + ESC_POS.BOLD_OFF
    invoice += `Razon Social: ${ThermalPrinterUtils.cleanText(data.customerName)}\n`
    invoice += `RUC: ${data.customerRuc}\n`
    if (data.table) {
      invoice += `Mesa: ${data.table}\n`
    }

    invoice += ThermalPrinterUtils.createLine('-')

    // Items
    invoice += ESC_POS.BOLD_ON + 'CANT DESCRIPCION        TOTAL\n' + ESC_POS.BOLD_OFF
    invoice += ThermalPrinterUtils.createLine('-')

    data.items.forEach(item => {
      invoice += ThermalPrinterUtils.formatProduct(
        ThermalPrinterUtils.cleanText(item.name),
        item.quantity,
        item.total
      )
    })

    invoice += ThermalPrinterUtils.createLine('-')

    // Totales
    invoice += ThermalPrinterUtils.formatPrice('Subtotal:', data.subtotal)
    invoice += ThermalPrinterUtils.formatPrice('IGV:', data.tax)
    invoice += ThermalPrinterUtils.createLine('-')
    
    invoice += ESC_POS.BOLD_ON + ESC_POS.SIZE_DOUBLE_HEIGHT
    invoice += ThermalPrinterUtils.formatPrice('TOTAL:', data.total)
    invoice += ESC_POS.SIZE_NORMAL + ESC_POS.BOLD_OFF

    // Notas
    if (data.notes) {
      invoice += ThermalPrinterUtils.createLine('-')
      invoice += 'Observaciones:\n'
      invoice += ThermalPrinterUtils.cleanText(data.notes) + '\n'
    }

    // QR Code
    invoice += '\n' + ESC_POS.ALIGN_CENTER
    invoice += ThermalPrinterUtils.createQR(`https://mrfrit.com/factura/${data.invoiceNumber}`)
    invoice += ESC_POS.ALIGN_LEFT

    // Pie de página
    invoice += '\n' + ESC_POS.ALIGN_CENTER
    invoice += ThermalPrinterUtils.cleanText('Gracias por su preferencia\n')
    invoice += 'Esta factura es valida como\n'
    invoice += 'comprobante de pago\n'
    invoice += ESC_POS.ALIGN_LEFT

    // Corte final
    invoice += '\n\n\n' + ESC_POS.CUT_FULL

    return invoice
  }
}