'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Printer, Loader2, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';

interface KitchenTicketPreviewProps {
  orderId: string;
  trigger?: React.ReactNode;
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
}

interface PreviewData {
  preview: string;
  orderData: {
    orderNumber: string;
    tableNumber: string;
    itemCount: number;
    isUrgent: boolean;
  };
  serviceStatus: {
    isAvailable: boolean;
    message: string;
    lastCheck: string;
    config?: {
      ip: string;
      port: number;
      timeout: number;
    };
  };
}

export function KitchenTicketPreview({ 
  orderId, 
  trigger, 
  onPrintSuccess, 
  onPrintError 
}: KitchenTicketPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const generatePreview = async () => {
    setIsLoadingPreview(true);
    
    try {
      // Ejecutar vista previa y verificación de conectividad en paralelo
      const [previewResponse, connectivityResponse] = await Promise.allSettled([
        // Generar vista previa del ticket
        fetch('/api/thermal-print/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId }),
        }),
        // Verificar conectividad TCP sin imprimir
        fetch('/api/printer-connectivity-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ printerType: 'kitchen' }),
        })
      ]);

      let previewResult = null;
      let connectivityResult = null;

      // Procesar resultado de vista previa
      if (previewResponse.status === 'fulfilled' && previewResponse.value.ok) {
        previewResult = await previewResponse.value.json();
      } else {
        console.error('Error en vista previa:', previewResponse.status === 'fulfilled' ? await previewResponse.value.text() : 'Network error');
        throw new Error('No se pudo generar la vista previa del ticket');
      }

      // Procesar resultado de conectividad
      if (connectivityResponse.status === 'fulfilled') {
        if (connectivityResponse.value.ok) {
          connectivityResult = await connectivityResponse.value.json();
          console.log('✅ Impresora de cocina disponible:', connectivityResult.ip + ':' + connectivityResult.port);
        } else {
          const errorData = await connectivityResponse.value.json();
          connectivityResult = {
            success: false,
            isReachable: false,
            error: errorData.error || 'Error de conectividad',
            message: errorData.message || 'No se puede conectar con la impresora'
          };
          console.log('❌ Impresora de cocina no disponible:', connectivityResult.error);
        }
      } else {
        connectivityResult = {
          success: false,
          isReachable: false,
          error: 'Error de red',
          message: 'No se pudo verificar la conectividad de la impresora'
        };
        console.log('❌ Error de red al verificar impresora');
      }

      // Actualizar datos con información de conectividad
      const updatedPreviewData = {
        ...previewResult,
        serviceStatus: {
          isAvailable: connectivityResult?.success && connectivityResult?.isReachable || false,
          message: connectivityResult?.success && connectivityResult?.isReachable
            ? connectivityResult.message || 'Impresora conectada y disponible'
            : connectivityResult?.message || connectivityResult?.error || 'Impresora no disponible',
          lastCheck: new Date().toLocaleTimeString(),
          config: {
            ip: connectivityResult?.ip || 'N/A',
            port: connectivityResult?.port || 0,
            timeout: connectivityResult?.timeout || 0
          }
        }
      };

      setPreviewData(updatedPreviewData);
      
    } catch (error) {
      console.error('Error:', error);
      onPrintError?.('Error al generar vista previa del ticket de cocina');
      
      // Establecer datos de error
      setPreviewData({
        preview: 'Error generando vista previa',
        orderData: {
          orderNumber: 'N/A',
          tableNumber: 'N/A',
          itemCount: 0,
          isUrgent: false
        },
        serviceStatus: {
          isAvailable: false,
          message: error instanceof Error ? error.message : 'Error desconocido',
          lastCheck: new Date().toLocaleTimeString()
        }
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePrint = async () => {
    // En lugar de imprimir, solo verificamos conectividad
    setIsPrinting(true);
    try {
      const response = await fetch('/api/printer-connectivity-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ printerType: 'kitchen' }),
      });

      const result = await response.json();

      if (result.success && result.isReachable) {
        onPrintSuccess?.();
        setIsOpen(false);
        // Mostrar mensaje de éxito con información de conectividad
        console.log('✅ Verificación exitosa:', result.message);
      } else {
        throw new Error(result.message || 'No se pudo conectar con la impresora');
      }
    } catch (error) {
      console.error('Error:', error);
      onPrintError?.('Error verificando conexión: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !previewData) {
      generatePreview();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Eye className="h-4 w-4 mr-2" />
      Vista Previa
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vista Previa - Ticket de Cocina</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Generando vista previa...</span>
            </div>
          ) : previewData ? (
            <>
              {/* Información del pedido */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 flex items-center justify-between">
                  <div>
                    <strong>Pedido:</strong> {previewData.orderData.orderNumber} | 
                    <strong> Mesa:</strong> {previewData.orderData.tableNumber} | 
                    <strong> Items:</strong> {previewData.orderData.itemCount}
                  </div>
                  {previewData.orderData.isUrgent && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      URGENTE
                    </span>
                  )}
                </div>
              </div>

              {/* Estado del servicio con detalles de conectividad */}
              <Alert className={previewData.serviceStatus.isAvailable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {previewData.serviceStatus.isAvailable ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={previewData.serviceStatus.isAvailable ? 'text-green-800' : 'text-red-800'}>
                      <strong>Estado:</strong> {previewData.serviceStatus.message}
                    </AlertDescription>
                  </div>
                  
                  {/* Información de configuración */}
                  {previewData.serviceStatus.config && (
                    <div className="text-xs text-gray-600 pl-6">
                      <div><strong>IP:</strong> {previewData.serviceStatus.config.ip}</div>
                      <div><strong>Puerto:</strong> {previewData.serviceStatus.config.port}</div>
                      <div><strong>Última verificación:</strong> {previewData.serviceStatus.lastCheck}</div>
                    </div>
                  )}
                  
                  {/* Nota informativa */}
                  <div className="text-xs text-gray-500 pl-6 italic">
                    Esta vista previa NO imprime. Solo verifica la conectividad del puerto {previewData.serviceStatus.config?.port || '9100'}.
                  </div>
                </div>
              </Alert>
              
              {/* Vista previa del ticket */}
              <div className="flex-1 overflow-y-auto">
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs whitespace-pre-line min-h-96">
                  {previewData.preview}
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  onClick={handlePrint} 
                  disabled={isPrinting}
                  className="flex-1"
                  variant="secondary"
                >
                  {isPrinting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 mr-2" />
                      Verificar Conectividad
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isPrinting}
                >
                  Cerrar
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Vista previa sin impresión</p>
                    <p className="text-xs mt-1">
                      Esta vista previa NO imprime. El botón &quot;Verificar Conectividad&quot; solo revisa si la impresora está disponible en la red (puerto 9100).
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Error al cargar la vista previa
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}