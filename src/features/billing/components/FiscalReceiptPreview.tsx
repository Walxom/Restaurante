'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Printer, 
  Loader2, 
  CheckCircle, 
  XCircle,
  FileText, 
  Receipt,
  AlertTriangle,
  Building2,
  Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FiscalReceiptPreviewProps {
  orderId: string;
  documentType?: 'BOLETA' | 'FACTURA';
  customerName?: string;
  customerRuc?: string;
  trigger?: React.ReactNode;
  // Control externo del estado del diálogo (para evitar nesting con DropdownMenu)
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
}

interface PreviewData {
  preview: string;
  documentData: {
    type: 'BOLETA' | 'FACTURA';
    number: string;
    orderNumber: string;
    customerName: string;
    total: string;
    itemCount: number;
  };
  serviceStatus: {
    isAvailable: boolean;
    message: string;
    lastCheck: string;
  };
  systemConfig?: {
    companyName: string;
    companyRuc: string;
    companyAddress: string;
    companyPhone: string;
  };
}

export function FiscalReceiptPreview({ 
  orderId, 
  documentType = 'BOLETA',
  customerName,
  customerRuc,
  trigger, 
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onPrintSuccess, 
  onPrintError 
}: FiscalReceiptPreviewProps) {
  // Modo controlado externamente (e.g. desde ThermalPrintButton) vs. modo autónomo con trigger
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? (controlledOpen ?? false) : internalOpen;
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const generatePreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('/api/thermal-print/receipt-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId,
          documentType,
          customerName,
          customerRuc
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar vista previa');
      }

      const data = await response.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        throw new Error(data.error || 'Error en la respuesta');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al generar vista previa';
      toast.error(errorMessage);
      onPrintError?.(errorMessage);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handlePrint = async () => {
    if (!previewData) return;

    setIsPrinting(true);
    try {
      // Usar el endpoint real de impresión fiscal
      const response = await fetch('/api/thermal-print/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          documentType: previewData.documentData.type,
          customerName: previewData.documentData.customerName,
          customerRuc: documentType === 'FACTURA' ? customerRuc : undefined,
          paymentMethod: 'EFECTIVO',
          amountPaid: parseFloat(previewData.documentData.total)
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`${previewData.documentData.type} impresa exitosamente`);
        onPrintSuccess?.();
        handleOpenChange(false);
      } else {
        throw new Error(result.error || 'Error al imprimir');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al imprimir comprobante';
      toast.error(errorMessage);
      onPrintError?.(errorMessage);
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
      // Limpiar datos de preview al cerrar para que se recarguen la próxima vez
      setPreviewData(null);
    }
  };

  const getDocumentIcon = () => {
    return documentType === 'FACTURA' ? (
      <FileText className="h-5 w-5 text-blue-500" />
    ) : (
      <Receipt className="h-5 w-5 text-green-500" />
    );
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Printer className="h-4 w-4 mr-2" />
      Reimprimir {documentType}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* Solo renderizar el trigger cuando no se controla externamente */}
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDocumentIcon()}
            Reimprimir - {documentType}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Generando vista previa...</span>
            </div>
          ) : previewData ? (
            <>
              {/* Información del documento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-card/40 backdrop-blur-md border border-border/50 rounded-[2rem] shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={previewData.documentData.type === 'FACTURA' ? 'default' : 'secondary'} className="rounded-xl px-2.5 py-0.5 text-[10px] font-black tracking-widest uppercase">
                      {previewData.documentData.type}
                    </Badge>
                    <span className="text-xs font-black text-foreground uppercase tracking-widest">{previewData.documentData.number}</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground space-y-1.5 opacity-80">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-primary" />
                      <span>Pedido: <span className="text-foreground">{previewData.documentData.orderNumber}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate">Cliente: <span className="text-foreground">{previewData.documentData.customerName}</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 flex flex-col justify-between md:items-end">
                  <div className="md:text-right">
                    <div className="text-xl font-black text-emerald-500 tracking-tight">
                      S/ {previewData.documentData.total}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {previewData.documentData.itemCount} items en pedido
                    </div>
                  </div>
                  
                  {/* Información de la empresa */}
                  {previewData.systemConfig && (
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground space-y-0.5 opacity-60">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-primary" />
                        <span>{previewData.systemConfig.companyName}</span>
                      </div>
                      <div>RUC: {previewData.systemConfig.companyRuc}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Estado del servicio */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-sm ${
                previewData.serviceStatus.isAvailable 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse'
              }`}>
                <div className={`p-1.5 rounded-full ${previewData.serviceStatus.isAvailable ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                  {previewData.serviceStatus.isAvailable ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                  Estado: <span className="opacity-80 font-bold">{previewData.serviceStatus.message}</span>
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
                      Imprimiendo...
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir {previewData.documentData.type}
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

              {/* Advertencia sobre ahorrar papel */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-blue-700 dark:text-blue-400">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-blue-500/20">
                    <Printer className="h-4 w-4 text-blue-500 shrink-0" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest">Reimpresión de Comprobante</p>
                    <p className="text-[9px] font-bold uppercase tracking-wide opacity-80 leading-normal">
                      Esta vista digital simula el papel térmico real. 
                      Verifica la información antes de enviar la orden de reimpresión física.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <p>Error al cargar la vista previa</p>
              <Button 
                variant="outline" 
                onClick={generatePreview}
                className="mt-2"
              >
                Reintentar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
