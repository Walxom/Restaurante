/**
 * DRIVER DE IMPRESORA TERMICA PARA PRODUCCION
 * Sistema optimizado con configuración dinámica desde base de datos
 * Integrado con la aplicacion Mr. Frit
 */

import { createConnection } from 'net';
import { PrinterConfigService } from './printer-config';

// Comandos ESC/POS optimizados y verificados
const ESC_POS = {
  // Comandos basicos
  INIT: Buffer.from([0x1B, 0x40]),
  LF: Buffer.from([0x0A]),
  
  // Alineacion
  ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]),
  
  // Formato de texto
  BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
  UNDERLINE_ON: Buffer.from([0x1B, 0x2D, 0x01]),
  UNDERLINE_OFF: Buffer.from([0x1B, 0x2D, 0x00]),
  EMPHASIZED_ON: Buffer.from([0x1B, 0x47, 0x01]),
  EMPHASIZED_OFF: Buffer.from([0x1B, 0x47, 0x00]),
  INVERT_ON: Buffer.from([0x1D, 0x42, 0x01]),
  INVERT_OFF: Buffer.from([0x1D, 0x42, 0x00]),
  
  // Tamanos de fuente
  SIZE_NORMAL: Buffer.from([0x1D, 0x21, 0x00]),
  SIZE_DOUBLE_HEIGHT: Buffer.from([0x1D, 0x21, 0x01]),
  SIZE_DOUBLE_WIDTH: Buffer.from([0x1D, 0x21, 0x10]),
  SIZE_DOUBLE: Buffer.from([0x1D, 0x21, 0x11]),
  SIZE_TRIPLE_HEIGHT: Buffer.from([0x1D, 0x21, 0x02]),
  
  // Fuentes alternativas
  FONT_A: Buffer.from([0x1B, 0x4D, 0x00]),
  FONT_B: Buffer.from([0x1B, 0x4D, 0x01]),
  
  // Alimentacion de papel
  FEED_1_LINE: Buffer.from([0x1B, 0x64, 0x01]),
  FEED_2_LINES: Buffer.from([0x1B, 0x64, 0x02]),
  FEED_3_LINES: Buffer.from([0x1B, 0x64, 0x03]),
  
  // Corte y sonido optimizados
  CUT_PAPER: Buffer.from([0x1D, 0x56, 0x41, 0x03]),
  BEEP_3: Buffer.from([0x1B, 0x42, 0x03, 0x03]),
  
  // Tabla de caracteres optimizada
  CHAR_TABLE_PC850: Buffer.from([0x1B, 0x74, 0x02]),
  
  // Separadores visuales
  LINE_SIMPLE: Buffer.from(''.padEnd(48, '-') + '\n', 'ascii'),
  LINE_DOUBLE: Buffer.from(''.padEnd(48, '=') + '\n', 'ascii'),
  LINE_DOTS: Buffer.from(''.padEnd(48, '.') + '\n', 'ascii'),
  LINE_STARS: Buffer.from(''.padEnd(48, '*') + '\n', 'ascii'),
};

// Tipos para la aplicacion
interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  notes?: string[];
  allergies?: string[];
  priority?: 'normal' | 'urgent';
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  tableNumber: string;
  waiterName: string;
  customerName?: string;
  items: OrderItem[];
  specialNotes?: string[];
  isUrgent?: boolean;
  createdAt: Date;
}

interface PrintResult {
  success: boolean;
  message: string;
  commandSize?: number;
  printTime?: number;
}

// Funcion para limpiar caracteres problematicos
function cleanTextForPrinter(text: string): string {
  const replacements: Record<string, string> = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U',
    '¿': '', '¡': '', '°': 'º',
    '€': 'EUR', '£': 'GBP',
    // Limpiar caracteres AM/PM problemáticos
    'a.\u202fm.': 'AM', 'p.\u202fm.': 'PM',
    'a.m.': 'AM', 'p.m.': 'PM',
    'a. m.': 'AM', 'p. m.': 'PM'
  };
  
  let cleanText = text;
  for (const [search, replace] of Object.entries(replacements)) {
    cleanText = cleanText.replace(new RegExp(search, 'g'), replace);
  }
  
  // Remover cualquier carácter de control o no-ASCII restante
  cleanText = cleanText.replace(/[^\x20-\x7E]/g, '');
  
  return cleanText;
}

// Función centralizada para formatear timestamps
function formatTimestamp(date: Date): string {
  const timestamp = date.toLocaleString('es-PE', { 
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false  // Usar formato 24 horas para evitar AM/PM
  });
  
  // Limpiar cualquier carácter problemático del timestamp
  return cleanTextForPrinter(timestamp);
}

// Crear buffer seguro con ASCII
function createSafeBuffer(text: string): Buffer {
  const cleanText = cleanTextForPrinter(text);
  return Buffer.from(cleanText, 'ascii');
}

// Crear header simplificado
function createKitchenHeader(): Buffer {
  const commands: Buffer[] = [];
  
  commands.push(ESC_POS.INIT);
  commands.push(ESC_POS.CHAR_TABLE_PC850);
  commands.push(ESC_POS.SIZE_DOUBLE);
  
  return Buffer.concat(commands);
}

// Crear informacion de orden
function createOrderInfo(order: KitchenOrder): Buffer {
  const commands: Buffer[] = [];
  
  commands.push(ESC_POS.ALIGN_LEFT);
  commands.push(ESC_POS.BOLD_ON);
  commands.push(ESC_POS.SIZE_DOUBLE_HEIGHT);
  commands.push(createSafeBuffer(`ORDEN #${order.orderNumber}`));
  commands.push(ESC_POS.LF);
  commands.push(ESC_POS.SIZE_DOUBLE);
  commands.push(ESC_POS.BOLD_OFF);
  
  const tableWaiterLine = `Mesa: ${order.tableNumber}`.padEnd(20) + `Mesero: ${order.waiterName}`;
  commands.push(createSafeBuffer(tableWaiterLine));
  commands.push(ESC_POS.LF);
  if (order.customerName) {
    commands.push(createSafeBuffer(`Cliente: ${order.customerName}`));
    commands.push(ESC_POS.LF);
  }
  
  commands.push(createSafeBuffer(`Fecha: ${formatTimestamp(order.createdAt)}`));
  commands.push(ESC_POS.LF);
  commands.push(ESC_POS.BOLD_ON);
  commands.push(createSafeBuffer('================'));
  commands.push(ESC_POS.LF);
  commands.push(ESC_POS.BOLD_OFF);
  
  return Buffer.concat(commands);
}

// Crear item de cocina
function createKitchenItem(item: OrderItem): Buffer {
  const commands: Buffer[] = [];
  
  commands.push(ESC_POS.SIZE_DOUBLE);
  // Nombre del item con cantidad
  if (item.priority === 'urgent') {
    commands.push(ESC_POS.SIZE_DOUBLE_WIDTH);
    commands.push(ESC_POS.BOLD_ON);
  } else {
    commands.push(ESC_POS.EMPHASIZED_ON);
  }
  
  commands.push(createSafeBuffer(`${item.quantity}x ${item.productName}`));
  commands.push(ESC_POS.LF);
  
  if (item.priority === 'urgent') {
    commands.push(ESC_POS.SIZE_DOUBLE);
    commands.push(ESC_POS.BOLD_OFF);
  } else {
    commands.push(ESC_POS.EMPHASIZED_OFF);
  }
  
  // Notas del item
  if (item.notes && item.notes.length > 0) {
    item.notes.forEach(note => {
      commands.push(ESC_POS.FONT_B);
      commands.push(createSafeBuffer(`   - ${note}`));
      commands.push(ESC_POS.LF);
      commands.push(ESC_POS.FONT_A);
    });
  }
  
  // Alertas de alergias
  if (item.allergies && item.allergies.length > 0) {
    item.allergies.forEach(allergy => {
      commands.push(ESC_POS.INVERT_ON);
      commands.push(createSafeBuffer(` ALERGIA: ${allergy} `));
      commands.push(ESC_POS.INVERT_OFF);
      commands.push(ESC_POS.LF);
    });
  }
  
  return Buffer.concat(commands);
}

// Crear alerta urgente
function createUrgentAlert(): Buffer {
  const commands: Buffer[] = [];
  
  commands.push(ESC_POS.FEED_2_LINES);
  commands.push(ESC_POS.ALIGN_CENTER);
  commands.push(ESC_POS.SIZE_TRIPLE_HEIGHT);
  commands.push(ESC_POS.BOLD_ON);
  commands.push(ESC_POS.INVERT_ON);
  commands.push(createSafeBuffer(' URGENTE '));
  commands.push(ESC_POS.INVERT_OFF);
  commands.push(ESC_POS.BOLD_OFF);
  commands.push(ESC_POS.SIZE_NORMAL);
  commands.push(ESC_POS.LF);
  commands.push(ESC_POS.FEED_1_LINE);
  
  return Buffer.concat(commands);
}

// Crear notas especiales
function createSpecialNotes(notes: string[]): Buffer {
  const commands: Buffer[] = [];
  
  commands.push(ESC_POS.UNDERLINE_ON);
  commands.push(ESC_POS.SIZE_DOUBLE);
  commands.push(createSafeBuffer('NOTAS ESPECIALES:'));
  commands.push(ESC_POS.UNDERLINE_OFF);
  commands.push(ESC_POS.LF);
  
  notes.forEach(note => {
    commands.push(createSafeBuffer(`- ${note}`));
    commands.push(ESC_POS.LF);
  });
  
  
  return Buffer.concat(commands);
}

// Crear footer
// Crear footer simplificado
function createKitchenFooter(): Buffer {
  const commands: Buffer[] = [];
  
  commands.push(ESC_POS.FEED_3_LINES);
  commands.push(ESC_POS.CUT_PAPER);
  commands.push(ESC_POS.BEEP_3);
  
  return Buffer.concat(commands);
}

// Crear orden completa para cocina
function createKitchenTicket(order: KitchenOrder): Buffer {
  const commands: Buffer[] = [];
  
  // Header
  commands.push(createKitchenHeader());
  
  // Informacion de orden
  commands.push(createOrderInfo(order));
  
  // Titulo de items
  // (Título removido por solicitud)
  
  // Items
  order.items.forEach(item => {
    commands.push(createKitchenItem(item));
  });
  
  // Alerta urgente si aplica
  if (order.isUrgent) {
    commands.push(createUrgentAlert());
  }
  
  // Notas especiales
  if (order.specialNotes && order.specialNotes.length > 0) {
    commands.push(createSpecialNotes(order.specialNotes));
  }
  
  // Footer
  commands.push(createKitchenFooter());
  
  return Buffer.concat(commands);
}

// Clase principal del driver
export class ThermalPrinter {
  private config: {
    ip: string;
    port: number;
    timeout: number;
    reconnectAttempts: number;
    reconnectDelay: number;
  } | null = null;
  private isConnected = false;
  private lastError: string | null = null;
  
  // Obtener configuración dinámicamente
  private async getConfig() {
    if (!this.config) {
      this.config = await PrinterConfigService.getKitchenPrinterConfig();
    }
    return this.config;
  }

  // Refrescar configuración desde la base de datos
  public async refreshConfig() {
    this.config = null; // Limpiar cache
    return this.getConfig();
  }
  
  // Enviar comando a la impresora
  private async sendCommand(command: Buffer, description = 'Impresion'): Promise<PrintResult> {
    const startTime = Date.now();
    const config = await this.getConfig();
    
    if (!config) {
      return {
        success: false,
        message: 'No hay configuración de impresora activa'
      };
    }
    
    return new Promise((resolve) => {
      const socket = createConnection({
        host: config.ip,
        port: config.port,
        timeout: config.timeout
      });
      
      let connected = false;
      let dataWritten = false;
      
      socket.setTimeout(config.timeout);
      
      const connectionTimeout = setTimeout(() => {
        if (!connected) {
          socket.destroy();
          this.lastError = 'Timeout de conexion';
          resolve({
            success: false,
            message: 'Timeout conectando a la impresora'
          });
        }
      }, 10000);
      
      socket.on('connect', () => {
        connected = true;
        this.isConnected = true;
        clearTimeout(connectionTimeout);
        
        socket.write(command, (error) => {
          if (error) {
            socket.destroy();
            this.lastError = error.message;
            resolve({
              success: false,
              message: `Error enviando comando: ${error.message}`
            });
          } else {
            dataWritten = true;
            setTimeout(() => socket.end(), 3000);
          }
        });
      });
      
      socket.on('error', (error) => {
        clearTimeout(connectionTimeout);
        this.isConnected = false;
        this.lastError = error.message;
        
        let friendlyMessage = 'Error de conexion';
        if (error.message.includes('ECONNREFUSED')) {
          friendlyMessage = 'Impresora no disponible o puerto ocupado';
        } else if (error.message.includes('EHOSTUNREACH')) {
          friendlyMessage = 'Impresora no encontrada en la red';
        } else if (error.message.includes('ETIMEDOUT')) {
          friendlyMessage = 'Timeout - Impresora muy lenta';
        }
        
        socket.destroy();
        resolve({
          success: false,
          message: friendlyMessage
        });
      });
      
      socket.on('close', (hadError) => {
        clearTimeout(connectionTimeout);
        this.isConnected = false;
        
        if (dataWritten && !hadError) {
          const printTime = Date.now() - startTime;
          resolve({
            success: true,
            message: `${description} completada exitosamente`,
            commandSize: command.length,
            printTime
          });
        }
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        this.lastError = 'Timeout del socket';
        if (!dataWritten) {
          resolve({
            success: false,
            message: 'Timeout - La impresora no procesó el comando'
          });
        }
      });
    });
  }
  
  // Imprimir orden de cocina
  async printKitchenOrder(order: KitchenOrder): Promise<PrintResult> {
    try {
      const ticket = createKitchenTicket(order);
      const result = await this.sendCommand(ticket, `Orden de Cocina #${order.orderNumber}`);
      
      if (result.success) {
        console.log(`✅ Orden #${order.orderNumber} impresa exitosamente`);
      } else {
        console.error(`❌ Error imprimiendo orden #${order.orderNumber}:`, result.message);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.lastError = errorMessage;
      
      return {
        success: false,
        message: `Error inesperado: ${errorMessage}`
      };
    }
  }
  
  /**
   * Generar vista previa del ticket sin imprimir
   */
  generateTicketPreview(orderData: KitchenOrder): string {
    try {
      const lines: string[] = [];
      
      // Header removido
      
      // Información de la orden
      lines.push(`ORDEN #${orderData.orderNumber}`);
      lines.push(`Mesa: ${orderData.tableNumber}`.padEnd(20) + `Mesero: ${orderData.waiterName}`);
      if (orderData.customerName) {
        lines.push(`Cliente: ${orderData.customerName}`);
      }
      lines.push(`Fecha: ${formatTimestamp(orderData.createdAt)}`);
      lines.push('');
      
      // Items
      // (Título removido)
      
      orderData.items.forEach((item: OrderItem) => {
        const itemLine = `${item.quantity}x ${item.productName}`;
        if (item.priority === 'urgent') {
          lines.push(`>>> ${itemLine} <<<`);
        } else {
          lines.push(itemLine);
        }
        
        // Notas del item
        if (item.notes && item.notes.length > 0) {
          item.notes.forEach((note: string) => {
            lines.push(`   - ${note}`);
          });
        }
        
        // Alergias
        if (item.allergies && item.allergies.length > 0) {
          item.allergies.forEach((allergy: string) => {
            lines.push(`   ⚠️  ALERGIA: ${allergy.toUpperCase()}`);
          });
        }
        lines.push('');
      });
      
      // Alerta urgente
      if (orderData.isUrgent) {
        lines.push('********************************');
        lines.push('          URGENTE');
        lines.push('********************************');
        lines.push('');
      }
      
      // Notas especiales
      if (orderData.specialNotes && orderData.specialNotes.length > 0) {
        lines.push('★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★');
        lines.push('NOTAS ESPECIALES:');
        orderData.specialNotes.forEach((note: string) => {
          lines.push(`- ${note}`);
        });
        lines.push('★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★');
        lines.push('');
      }
      
      // Footer
      lines.push('');
      lines.push('================================');
      lines.push('');
      
      // Limpiar texto para caracteres compatibles
      const preview = lines.map(line => cleanTextForPrinter(line)).join('\n');
      
      return preview;
      
    } catch (error) {
      console.error('Error generando vista previa:', error);
      return 'Error generando vista previa del ticket';
    }
  }
  
  /**
   * Verificar estado del servicio de impresión (solo conectividad TCP, sin imprimir)
   */
  async checkServiceStatus(): Promise<{ isConnected: boolean; message: string; responseTime?: number }> {
    try {
      const config = await this.getConfig();
      
      if (!config) {
        return {
          isConnected: false,
          message: 'No hay configuración de impresora de cocina activa'
        };
      }
      
      const startTime = Date.now();
      
      return new Promise((resolve) => {
        console.log(`🔍 Verificando conectividad TCP: ${config.ip}:${config.port}`);
        
        const socket = createConnection({
          host: config.ip,
          port: config.port,
          timeout: 3000 // Timeout de 3 segundos para verificación rápida
        });

        const timeoutId = setTimeout(() => {
          socket.destroy();
          resolve({
            isConnected: false,
            message: `Puerto ${config.port} no responde en ${config.ip}`
          });
        }, 3000);

        socket.on('connect', () => {
          const responseTime = Date.now() - startTime;
          clearTimeout(timeoutId);
          socket.destroy(); // Cerrar inmediatamente, solo verificamos conectividad
          
          console.log(`✅ Puerto ${config.port} abierto en ${config.ip} (${responseTime}ms)`);
          resolve({
            isConnected: true,
            message: `Servicio de impresión disponible en ${config.ip}:${config.port}`,
            responseTime
          });
        });

        socket.on('error', (error) => {
          clearTimeout(timeoutId);
          let friendlyMessage = 'Puerto cerrado o impresora no disponible';
          
          if (error.message.includes('ECONNREFUSED')) {
            friendlyMessage = `Puerto ${config.port} cerrado en ${config.ip}`;
          } else if (error.message.includes('EHOSTUNREACH')) {
            friendlyMessage = `Host ${config.ip} no alcanzable`;
          } else if (error.message.includes('ETIMEDOUT')) {
            friendlyMessage = `Timeout conectando a ${config.ip}:${config.port}`;
          }
          
          console.log(`❌ Error de conectividad: ${friendlyMessage}`);
          resolve({
            isConnected: false,
            message: friendlyMessage
          });
        });

        socket.on('timeout', () => {
          clearTimeout(timeoutId);
          socket.destroy();
          resolve({
            isConnected: false,
            message: `Timeout verificando ${config.ip}:${config.port}`
          });
        });
      });
    } catch (error) {
      return {
        isConnected: false,
        message: `Error verificando estado del servicio: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }
  
  /**
   * Probar conexión TCP sin imprimir (solo verificar puerto)
   */
  async testConnection(): Promise<PrintResult> {
    try {
      const config = await this.getConfig();
      
      if (!config) {
        return {
          success: false,
          message: 'No hay configuración de impresora activa para probar'
        };
      }
      
      const startTime = Date.now();
      
      return new Promise((resolve) => {
        const socket = createConnection({
          host: config.ip,
          port: config.port,
          timeout: 3000
        });
        
        const timeoutId = setTimeout(() => {
          socket.destroy();
          resolve({
            success: false,
            message: 'Timeout verificando conexión'
          });
        }, 3000);
        
        socket.on('connect', () => {
          const printTime = Date.now() - startTime;
          clearTimeout(timeoutId);
          socket.destroy(); // Cerrar inmediatamente
          
          resolve({
            success: true,
            message: 'Conexión TCP exitosa',
            printTime
          });
        });
        
        socket.on('error', (error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            message: `Error de conexión: ${error.message}`
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  // Getters para estado
  get connectionStatus(): boolean {
    return this.isConnected;
  }
  
  get lastErrorMessage(): string | null {
    return this.lastError;
  }
  
  get printerConfig() {
    return { ...this.config };
  }
}

// Instancia singleton para la aplicacion
export const kitchenPrinter = new ThermalPrinter();

// Funciones de utilidad para la aplicacion
export const printerUtils = {
  cleanText: cleanTextForPrinter,
  formatTimestamp: formatTimestamp,
  validateText: (text: string): boolean => {
    const problematicChars = /[áéíóúÁÉÍÓÚñÑüÜ¿¡°€£¥™©®]/g;
    return !problematicChars.test(text);
  },
  createSafeBuffer
};
