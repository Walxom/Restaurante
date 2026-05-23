"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, FileText, Receipt, Users } from "lucide-react"
import { ReprintDialog } from "@/features/billing/components/ReprintDialog"
import { Order } from "@/types"

interface ThermalPrintButtonProps {
  order: Order
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "secondary"
  compact?: boolean
  currentUser?: {
    id: string
    name: string
    role: string
  }
}

export default function ThermalPrintButton({
  order,
  size = "sm",
  variant = "outline",
  compact = false,
  currentUser,
}: ThermalPrintButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  if (order.status !== 'COMPLETED') return null

  if (!currentUser) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-50">
        <Users className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Sin Usuario</span>
      </Button>
    )
  }

  const documentType = order.invoice?.type || 'BOLETA'
  const Icon = documentType === 'FACTURA' ? FileText : Receipt

  return (
    <>
      <ReprintDialog
        orderId={order.id}
        documentType={documentType}
        customerName={order.customerName || undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setTimeout(() => window.location.reload(), 1500)}
      />

      <Button
        variant={variant}
        size={compact ? "sm" : size}
        className={compact ? "h-7 px-2 text-xs" : ""}
        onClick={() => setDialogOpen(true)}
      >
        <Icon className={compact ? "h-3 w-3" : "h-4 w-4 mr-2"} />
        {!compact && <span>Reimprimir {documentType}</span>}
      </Button>
    </>
  )
}