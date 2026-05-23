'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Printer, Loader2, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';

interface KitchenTicketPreviewProps {
  orderId: string;
  trigger?: React.ReactNode;
  // Control externo del estado del diálogo (para evitar nesting con DropdownMenu)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onPrintSuccess, 
  onPrintError 
}: KitchenTicketPreviewProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? (controlledOpen ?? false) : internalOpen;
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
        handleOpenChange(false);
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
    if (isControlled) {
      controlledOnOpenChange?.(open);
    } else {
      setInternalOpen(open);
    }
    if (open && !previewData) {
      generatePreview();
    }
    if (!open) {
      setPreviewData(null);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Printer className="h-4 w-4 mr-2" />
      Reimprimir Ticket de Cocina
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Reimprimir Ticket de Cocina</DialogTitle>
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
              <div className="p-4 bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  <div>
                    <strong>Pedido:</strong> <span className="text-foreground">{previewData.orderData.orderNumber}</span> | 
                    <strong> Mesa:</strong> <span className="text-foreground">{previewData.orderData.tableNumber}</span> | 
                    <strong> Items:</strong> <span className="text-foreground">{previewData.orderData.itemCount}</span>
                  </div>
                  {previewData.orderData.isUrgent && (
                    <span className="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase animate-pulse">
                      URGENTE
                    </span>
                  )}
                </div>
              </div>

              {/* Estado del servicio con detalles de conectividad */}
              <div className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-sm ${
                previewData.serviceStatus.isAvailable 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400 animate-pulse'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-full ${previewData.serviceStatus.isAvailable ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                    {previewData.serviceStatus.isAvailable ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <WifiOff className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    Estado: <span className="opacity-80 font-bold">{previewData.serviceStatus.message}</span>
                  </div>
                </div>
                
                {/* Información de configuración */}
                {previewData.serviceStatus.config && (
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pl-10 space-y-1 opacity-80">
                    <div>IP: <span className="text-foreground">{previewData.serviceStatus.config.ip}</span></div>
                    <div>Puerto: <span className="text-foreground">{previewData.serviceStatus.config.port}</span></div>
                    <div>Última verificación: <span className="text-foreground">{previewData.serviceStatus.lastCheck}</span></div>
                  </div>
                )}
                
                {/* Nota informativa */}
                <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 pl-10 italic">
                  Esta vista previa NO imprime. Solo verifica la conectividad del puerto {previewData.serviceStatus.config?.port || '9100'}.
                </div>
              </div>
              
              {/* Vista previa del comprobante estilo papel térmico */}
              <div className="flex-1 overflow-y-auto max-h-[450px] p-2 bg-slate-900/5 dark:bg-slate-50/5 rounded-[2rem] border border-border/50">
                <div className="flex justify-center p-6">
                  {/* Papel Térmico Realista */}
                  <div className="w-full max-w-[320px] bg-[#fafafc] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] relative border border-slate-200">
                    {/* Bordes dentados simulados */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_center,_#e2e8f0_2px,_transparent_0)] bg-[length:8px_8px] bg-repeat-x -translate-y-1/2 opacity-40" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_center,_#e2e8f0_2px,_transparent_0)] bg-[length:8px_8px] bg-repeat-x translate-y-1/2 opacity-40" />

                    <div className="font-mono text-[9px] sm:text-[10px] leading-relaxed text-slate-800 whitespace-pre overflow-x-auto">
                      {previewData.preview}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border/50">
                <Button 
                  onClick={handlePrint} 
                  disabled={isPrinting}
                  className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:opacity-90 shadow-xl shadow-primary/15 transition-all"
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
                  onClick={() => handleOpenChange(false)}
                  disabled={isPrinting}
                  className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border bg-card/50 text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all shadow-sm"
                >
                  Cerrar
                </Button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-blue-700 dark:text-blue-400">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-blue-500/20">
                    <Printer className="h-4 w-4 text-blue-500 shrink-0" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest">Reimpresión de Comanda</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide opacity-80 leading-normal">
                      Esta vista digital simula la comanda térmica real. 
                      El botón &quot;Verificar Conectividad&quot; comprueba si la ticketera de cocina responde en red.
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