/**
 * SERVICIO DE CONFIGURACIÓN DE IMPRESORAS
 * Maneja la configuración de impresoras desde la base de datos
 */

import { prisma } from '@/lib/prisma';
import { PrinterType, PrinterConnectionType, PrinterStatus } from '@/types';

export interface PrinterConfig {
  id: string;
  name: string;
  type: PrinterType;
  connectionType: PrinterConnectionType;
  ipAddress?: string;
  port?: number;
  usbPath?: string;
  serialPort?: string;
  bluetoothAddress?: string;
  paperWidth: number;
  charactersPerLine: number;
  timeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;
  charset: string;
  codepage: string;
  status: PrinterStatus;
  isDefault: boolean;
  description?: string;
  location?: string;
  headerText?: string;
  footerText?: string;
}

export class PrinterConfigService {
  
  /**
   * Obtener configuración de impresora por tipo
   */
  static async getPrinterByType(type: PrinterType): Promise<PrinterConfig | null> {
    const printer = await prisma.printer.findFirst({
      where: {
        type,
        status: 'ACTIVE',
        isDefault: true
      }
    });

    return printer ? this.mapPrinterToConfig(printer) : null;
  }

  /**
   * Obtener todas las impresoras activas
   */
  static async getActivePrinters(): Promise<PrinterConfig[]> {
    const printers = await prisma.printer.findMany({
      where: {
        status: 'ACTIVE'
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });

    return printers.map(printer => this.mapPrinterToConfig(printer));
  }

  /**
   * Obtener impresora por ID
   */
  static async getPrinterById(id: string): Promise<PrinterConfig | null> {
    const printer = await prisma.printer.findUnique({
      where: { id }
    });

    return printer ? this.mapPrinterToConfig(printer) : null;
  }

  /**
   * Actualizar configuración de impresora
   */
  static async updatePrinter(id: string, data: Partial<PrinterConfig>, updatedBy: string): Promise<PrinterConfig | null> {
    const printer = await prisma.printer.update({
      where: { id },
      data: {
        ...data,
        updatedBy,
        updatedAt: new Date()
      }
    });

    return this.mapPrinterToConfig(printer);
  }

  /**
   * Crear nueva impresora
   */
  static async createPrinter(data: Omit<PrinterConfig, 'id'>, createdBy: string): Promise<PrinterConfig> {
    const printer = await prisma.printer.create({
      data: {
        ...data,
        createdBy
      }
    });

    return this.mapPrinterToConfig(printer);
  }

  /**
   * Cambiar estado de impresora
   */
  static async updatePrinterStatus(id: string, status: PrinterStatus, updatedBy: string): Promise<PrinterConfig | null> {
    const printer = await prisma.printer.update({
      where: { id },
      data: {
        status,
        updatedBy,
        updatedAt: new Date()
      }
    });

    return this.mapPrinterToConfig(printer);
  }

  /**
   * Establecer impresora por defecto para un tipo
   */
  static async setDefaultPrinter(id: string, updatedBy: string): Promise<PrinterConfig | null> {
    const printer = await prisma.printer.findUnique({
      where: { id }
    });

    if (!printer) return null;

    // Remover default de otras impresoras del mismo tipo
    await prisma.printer.updateMany({
      where: {
        type: printer.type,
        id: { not: id }
      },
      data: {
        isDefault: false,
        updatedBy,
        updatedAt: new Date()
      }
    });

    // Establecer esta impresora como default
    const updatedPrinter = await prisma.printer.update({
      where: { id },
      data: {
        isDefault: true,
        updatedBy,
        updatedAt: new Date()
      }
    });

    return this.mapPrinterToConfig(updatedPrinter);
  }

  /**
   * Eliminar impresora
   */
  static async deletePrinter(id: string): Promise<boolean> {
    try {
      await prisma.printer.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      console.error('Error eliminando impresora:', error);
      return false;
    }
  }

  /**
   * Obtener impresora de cocina por defecto
   */
  static async getKitchenPrinter(): Promise<PrinterConfig | null> {
    try {
      const printer = await prisma.printer.findFirst({
        where: {
          type: 'KITCHEN',
          status: 'ACTIVE',
          isDefault: true
        }
      });
      
      return printer ? this.mapPrinterToConfig(printer) : null;
    } catch (error) {
      console.error('Error obteniendo impresora de cocina:', error);
      return null;
    }
  }

  /**
   * Obtener impresora de caja por defecto
   */
  static async getCashPrinter(): Promise<PrinterConfig | null> {
    try {
      const printer = await prisma.printer.findFirst({
        where: {
          type: 'RECEIPT',
          status: 'ACTIVE',
          isDefault: true
        }
      });
      
      return printer ? this.mapPrinterToConfig(printer) : null;
    } catch (error) {
      console.error('Error obteniendo impresora de caja:', error);
      return null;
    }
  }

  /**
   * Mapear modelo de Prisma a interfaz de configuración
   */
  private static mapPrinterToConfig(printer: {
    id: string;
    name: string;
    type: string;
    connectionType: string;
    ipAddress: string | null;
    port: number | null;
    usbPath: string | null;
    serialPort: string | null;
    bluetoothAddress: string | null;
    paperWidth: number;
    charactersPerLine: number;
    timeout: number;
    reconnectAttempts: number;
    reconnectDelay: number;
    charset: string;
    codepage: string;
    status: string;
    isDefault: boolean;
    description: string | null;
    location: string | null;
    headerText: string | null;
    footerText: string | null;
  }): PrinterConfig {
    return {
      id: printer.id,
      name: printer.name,
      type: printer.type as PrinterType,
      connectionType: printer.connectionType as PrinterConnectionType,
      ipAddress: printer.ipAddress || undefined,
      port: printer.port || undefined,
      usbPath: printer.usbPath || undefined,
      serialPort: printer.serialPort || undefined,
      bluetoothAddress: printer.bluetoothAddress || undefined,
      paperWidth: printer.paperWidth,
      charactersPerLine: printer.charactersPerLine,
      timeout: printer.timeout,
      reconnectAttempts: printer.reconnectAttempts,
      reconnectDelay: printer.reconnectDelay,
      charset: printer.charset,
      codepage: printer.codepage,
      status: printer.status as PrinterStatus,
      isDefault: printer.isDefault,
      description: printer.description || undefined,
      location: printer.location || undefined,
      headerText: printer.headerText || undefined,
      footerText: printer.footerText || undefined
    };
  }

  /**
   * Obtener configuración de conexión para impresora de cocina
   */
  static async getKitchenPrinterConfig(): Promise<{
    ip: string;
    port: number;
    timeout: number;
    reconnectAttempts: number;
    reconnectDelay: number;
  } | null> {
    const printer = await this.getPrinterByType('KITCHEN');
    
    if (!printer || printer.connectionType !== 'NETWORK' || !printer.ipAddress || !printer.port) {
      return null;
    }

    return {
      ip: printer.ipAddress,
      port: printer.port,
      timeout: printer.timeout,
      reconnectAttempts: printer.reconnectAttempts,
      reconnectDelay: printer.reconnectDelay
    };
  }

  /**
   * Obtener configuración de conexión para impresora de caja
   */
  static async getCashPrinterConfig(): Promise<{
    bluetoothAddress: string;
    timeout: number;
    reconnectAttempts: number;
    reconnectDelay: number;
  } | null> {
    const printer = await this.getPrinterByType('RECEIPT');
    
    if (!printer || printer.connectionType !== 'BLUETOOTH' || !printer.bluetoothAddress) {
      return null;
    }

    return {
      bluetoothAddress: printer.bluetoothAddress,
      timeout: printer.timeout,
      reconnectAttempts: printer.reconnectAttempts,
      reconnectDelay: printer.reconnectDelay
    };
  }
}
