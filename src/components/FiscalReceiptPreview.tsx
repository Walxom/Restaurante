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
  onPrintSuccess, 
  onPrintError 
}: FiscalReceiptPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
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
        setIsOpen(false);
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
    setIsOpen(open);
    if (open && !previewData) {
      generatePreview();
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
      <Eye className="h-4 w-4 mr-2" />
      Vista Previa {documentType}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDocumentIcon()}
            Vista Previa - {documentType}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={previewData.documentData.type === 'FACTURA' ? 'default' : 'secondary'}>
                      {previewData.documentData.type}
                    </Badge>
                    <span className="text-sm font-medium">{previewData.documentData.number}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Receipt className="h-3 w-3" />
                      <span>Pedido: {previewData.documentData.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Cliente: {previewData.documentData.customerName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      S/ {previewData.documentData.total}
                    </div>
                    <div className="text-sm text-gray-500">
                      {previewData.documentData.itemCount} items
                    </div>
                  </div>
                  
                  {/* Información de la empresa */}
                  {previewData.systemConfig && (
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{previewData.systemConfig.companyName}</span>
                      </div>
                      <div>RUC: {previewData.systemConfig.companyRuc}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Estado del servicio */}
              <Alert className={previewData.serviceStatus.isAvailable ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
                <div className="flex items-center gap-2">
                  {previewData.serviceStatus.isAvailable ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                  <AlertDescription className={previewData.serviceStatus.isAvailable ? 'text-green-800' : 'text-orange-800'}>
                    <strong>Estado:</strong> {previewData.serviceStatus.message}
                  </AlertDescription>
                </div>
              </Alert>
              
              {/* Vista previa del comprobante */}
              <div className="flex-1 overflow-y-auto">
                <div className="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg">
                  <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs whitespace-pre-line min-h-96 max-h-96 overflow-y-auto">
                    {previewData.preview}
                  </div>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  onClick={handlePrint} 
                  disabled={isPrinting}
                  className="flex-1"
                  variant="default"
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
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isPrinting}
                >
                  Cerrar
                </Button>
              </div>

              {/* Advertencia sobre ahorrar papel */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Eye className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Modo Vista Previa</p>
                    <p className="text-xs mt-1">
                      Revisa el documento antes de imprimir para ahorrar papel. 
                      Esta vista muestra exactamente cómo se verá el comprobante impreso.
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
