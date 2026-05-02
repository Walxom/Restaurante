"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LucideIcon, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success' | 'info';
  icon?: LucideIcon;
  isLoading?: boolean;
  showCancel?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'primary',
  icon: Icon,
  isLoading = false,
  showCancel = true,
}: ConfirmationModalProps) {
  
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white",
    success: "bg-green-600 hover:bg-green-700 text-white",
    info: "bg-blue-600 hover:bg-blue-700 text-white",
  };

  const iconBgStyles = {
    primary: "bg-blue-100",
    danger: "bg-red-100",
    warning: "bg-yellow-100",
    success: "bg-green-100",
    info: "bg-blue-100",
  };

  const iconTextStyles = {
    primary: "text-blue-600",
    danger: "text-red-600",
    warning: "text-yellow-600",
    success: "text-green-600",
    info: "text-blue-600",
  };

  // Ícono por defecto según variante si no se provee uno
  const DefaultIcon = {
    danger: AlertTriangle,
    warning: AlertTriangle,
    success: () => <div className="w-6 h-6 border-2 border-current rounded-full flex items-center justify-center font-bold">✓</div>,
    info: () => <div className="w-6 h-6 border-2 border-current rounded-full flex items-center justify-center font-bold">i</div>,
    primary: AlertTriangle,
  }[variant];

  const FinalIcon = Icon || DefaultIcon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 scale-110",
              iconBgStyles[variant]
            )}>
              {typeof FinalIcon === 'function' ? <FinalIcon /> : <FinalIcon className={cn("w-6 h-6", iconTextStyles[variant])} />}
            </div>
            
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {title}
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-sm leading-relaxed">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="bg-gray-50 p-4 sm:p-6 flex flex-row gap-3 mt-0">
          {showCancel && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 h-11 rounded-xl font-medium transition-all"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          )}
          <Button
            onClick={onConfirm}
            className={cn(
              "flex-1 h-11 rounded-xl font-medium transition-all shadow-sm active:scale-95",
              variantStyles[variant],
              !showCancel && "w-full"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmationModal;
