/**
 * COMPONENTE DE IMPRESION TERMICA PARA PRODUCCION
 * Boton integrado con la aplicacion Mr. Frit
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PrintKitchenButtonProps {
  orderId: string;
  orderNumber?: string;
  tableNumber?: string;
  waiterName?: string;
  isUrgent?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showStatus?: boolean;
}

interface PrintResult {
  success: boolean;
  message: string;
  orderNumber?: string;
  commandSize?: number;
  printTime?: number;
}

interface PrintStatus {
  isConnected: boolean;
  lastPrintTime?: string;
  commandSize?: number;
  printTime?: number;
}

export function PrintKitchenButton({
  orderId,
  tableNumber,
  waiterName,
  isUrgent = false,
  disabled = false,
  size = 'default',
  variant = 'default',
  showStatus = false
}: PrintKitchenButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastPrintResult, setLastPrintResult] = useState<PrintResult | null>(null);
  const [printerStatus, setPrinterStatus] = useState<PrintStatus | null>(null);
  const [message, setMessage] = useState<string>('');

  // Imprimir orden en cocina
  const handlePrintKitchen = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/thermal-print/kitchen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          tableNumber,
          waiterName,
          isUrgent
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setLastPrintResult(result);
        setMessage(`Orden ${result.orderNumber} enviada a cocina exitosamente`);
      } else {
        throw new Error(result.details || result.error || 'Error de impresion');
      }
    } catch (error) {
      console.error('Error imprimiendo orden:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudo imprimir la orden');
    } finally {
      setIsLoading(false);
    }
  };

  // Probar conexion con impresora
  const handleTestConnection = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/thermal-print/kitchen', {
        method: 'GET',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPrinterStatus({
          isConnected: true,
          commandSize: result.commandSize,
          printTime: result.printTime
        });
        setMessage('La impresora de cocina esta funcionando correctamente');
      } else {
        setPrinterStatus({
          isConnected: false
        });
        throw new Error(result.details || 'Impresora no disponible');
      }
    } catch (error) {
      console.error('Error probando conexion:', error);
      setMessage(error instanceof Error ? error.message : 'No se pudo conectar con la impresora');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Boton principal de impresion */}
      <Button
        onClick={handlePrintKitchen}
        disabled={disabled || isLoading}
        size={size}
        variant={variant}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {isLoading ? 'Imprimiendo...' : 'Enviar a Cocina'}
        {isUrgent && (
          <span className="ml-1 px-2 py-1 bg-red-500 text-white text-xs rounded">
            URGENTE
          </span>
        )}
      </Button>

      {/* Boton de prueba de conexion (solo si showStatus esta activo) */}
      {showStatus && (
        <Button
          onClick={handleTestConnection}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          {printerStatus?.isConnected ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <AlertCircle className="h-3 w-3 text-yellow-500" />
          )}
          Probar Conexion
        </Button>
      )}

      {/* Mensaje de estado */}
      {message && (
        <div className={`text-xs p-2 rounded ${
          lastPrintResult?.success || printerStatus?.isConnected 
            ? 'bg-green-50 text-green-700' 
            : 'bg-red-50 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Informacion de estado */}
      {showStatus && lastPrintResult && (
        <div className="text-xs text-muted-foreground space-y-1 p-2 bg-gray-50 rounded">
          <div>Ultima impresion: {lastPrintResult.orderNumber}</div>
          {lastPrintResult.commandSize && (
            <div>Tamano: {lastPrintResult.commandSize} bytes</div>
          )}
          {lastPrintResult.printTime && (
            <div>Tiempo: {lastPrintResult.printTime}ms</div>
          )}
        </div>
      )}

      {/* Estado de la impresora */}
      {showStatus && printerStatus && (
        <div className="text-xs text-muted-foreground">
          Estado: {printerStatus.isConnected ? (
            <span className="text-green-600">Conectada</span>
          ) : (
            <span className="text-red-600">Desconectada</span>
          )}
        </div>
      )}
    </div>
  );
}

// Componente simplificado para usar en formularios
export function QuickPrintButton({ 
  orderId, 
  size = 'sm' 
}: { 
  orderId: string; 
  size?: 'sm' | 'default' | 'lg'; 
}) {
  return (
    <PrintKitchenButton
      orderId={orderId}
      size={size}
      variant="outline"
    />
  );
}

// Hook personalizado para manejo de impresion
export function useThermalPrinter() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/thermal-print/kitchen');
      const result = await response.json();
      setIsConnected(response.ok && result.success);
      return response.ok && result.success;
    } catch {
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const printOrder = async (orderId: string, options?: {
    tableNumber?: string;
    waiterName?: string;
    isUrgent?: boolean;
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/thermal-print/kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, ...options })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        return result;
      } else {
        throw new Error(result.details || result.error);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    isLoading,
    checkConnection,
    printOrder
  };
}
