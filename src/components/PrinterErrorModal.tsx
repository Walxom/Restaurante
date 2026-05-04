import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface PrinterErrorModalProps {
  open: boolean;
  errorMessage: string;
  onClose: () => void;
}

export default function PrinterErrorModal({ open, errorMessage, onClose }: PrinterErrorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Impresora de la cocina
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-gray-700">
          {errorMessage || "No se pudo conectar o imprimir en la impresora de cocina. Por favor, verifique la conexión de red, el cable de la impresora o consulte con soporte."}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
