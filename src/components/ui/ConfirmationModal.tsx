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
import { LucideIcon, AlertTriangle, CheckCircle2, Info, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success' | 'info' | 'destructive';
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
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20",
    destructive: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-500/20",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20",
    info: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20",
  };

  const iconBgStyles = {
    primary: "bg-blue-100 dark:bg-blue-900/30",
    danger: "bg-red-100 dark:bg-red-900/30",
    destructive: "bg-red-100 dark:bg-red-900/30",
    warning: "bg-yellow-100 dark:bg-yellow-900/30",
    success: "bg-green-100 dark:bg-green-900/30",
    info: "bg-blue-100 dark:bg-blue-900/30",
  };

  const iconTextStyles = {
    primary: "text-blue-600 dark:text-blue-400",
    danger: "text-red-600 dark:text-red-400",
    destructive: "text-red-600 dark:text-red-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    success: "text-green-600 dark:text-green-400",
    info: "text-blue-600 dark:text-blue-400",
  };

  // Ícono por defecto según variante si no se provee uno
  const DefaultIconMap: Record<string, LucideIcon> = {
    danger: AlertTriangle,
    destructive: AlertTriangle,
    warning: AlertTriangle,
    success: CheckCircle2,
    info: Info,
    primary: Info,
  };

  const FinalIcon = Icon || DefaultIconMap[variant] || Info;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 relative group",
              (variant === 'danger' || variant === 'destructive') && "bg-rose-500/10 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
              (variant === 'primary' || variant === 'info') && "bg-blue-500/10 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]",
              variant === 'warning' && "bg-amber-500/10 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
              variant === 'success' && "bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
            )}>
              <div className={cn(
                "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
                (variant === 'danger' || variant === 'destructive') && "bg-rose-500/20",
                (variant === 'primary' || variant === 'info') && "bg-blue-500/20",
                variant === 'warning' && "bg-amber-500/20",
                variant === 'success' && "bg-emerald-500/20",
              )} />
              <FinalIcon className={cn("w-8 h-8 relative z-10", iconTextStyles[variant])} />
            </div>

            <DialogHeader className="space-y-3 text-center sm:text-center">
              <DialogTitle className="text-xl font-black text-foreground uppercase tracking-widest">
                {title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest leading-relaxed opacity-60 max-w-[320px]">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 dark:bg-muted/10 p-4 sm:p-6 flex flex-row gap-3 mt-0 border-t border-border/50">
          {showCancel && (
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-background border-border text-foreground hover:bg-accent h-11 rounded-xl font-medium transition-all"
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
