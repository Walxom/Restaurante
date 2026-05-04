"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Printer, FileText, Receipt } from "lucide-react"

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  startDate?: string
  endDate?: string
  notes?: string
  customerName?: string
  customerDni?: string
  customerPhone?: string
  table?: {
    number: number
  }
  orderItems: Array<{
    id: string
    quantity: number
    unitPrice: number
    subtotal: number
    notes?: string
    status: string
    product: {
      name: string
    }
  }>
  user: {
    name: string
  }
  invoice?: {
    id: string
    type: 'BOLETA' | 'FACTURA'
    number: string
  }
}

interface SystemConfig {
  companyName: string
  companyAddress?: string
  companyPhone?: string
  companyRuc?: string
  taxRate: number
  currency: string
}

interface PrintOrderButtonProps {
  order: Order
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "secondary"
  compact?: boolean
}

export default function PrintOrderButton({ order, size = "sm", variant = "outline", compact = false }: PrintOrderButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null)

  useEffect(() => {
    const fetchSystemConfig = async () => {
      try {
        const response = await fetch('/api/system-config')
        if (response.ok) {
          const config = await response.json()
          setSystemConfig(config)
        }
      } catch (error) {
        console.error('Error al obtener configuración del sistema:', error)
      }
    }

    fetchSystemConfig()
  }, [])

  const generateReceipt = () => {
    if (!systemConfig) return
    
    setIsGenerating(true)
    
    // Crear ventana de impresión para boleta
    const printWindow = window.open('', '_blank', 'width=300,height=600')
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir')
      setIsGenerating(false)
      return
    }

    const receiptContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Boleta - Pedido #${order.orderNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 10px;
              width: 280px;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .restaurant-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .order-info {
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .items {
              margin-bottom: 10px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .item-name {
              flex: 1;
            }
            .item-qty {
              width: 30px;
              text-align: center;
            }
            .item-price {
              width: 60px;
              text-align: right;
            }
            .total-section {
              border-top: 1px dashed #000;
              padding-top: 10px;
              text-align: right;
            }
            .total {
              font-size: 14px;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              border-top: 1px dashed #000;
              padding-top: 10px;
              font-size: 10px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="restaurant-name">${systemConfig.companyName}</div>
            ${systemConfig.companyRuc ? `<div>RUC: ${systemConfig.companyRuc}</div>` : ''}
            ${systemConfig.companyAddress ? `<div>${systemConfig.companyAddress}</div>` : ''}
            ${systemConfig.companyPhone ? `<div>Tel: ${systemConfig.companyPhone}</div>` : ''}
          </div>
          
          <div class="order-info">
            <div><strong>BOLETA DE VENTA</strong></div>
            <div>Pedido: #${order.orderNumber}</div>
            <div>Fecha: ${new Date(order.createdAt).toLocaleString('es-PE')}</div>
            <div>Mesa: ${order.table ? `Mesa ${order.table.number}` : 'Para llevar'}</div>
            ${order.customerName ? `<div>Cliente: ${order.customerName}</div>` : ''}
            ${order.customerPhone ? `<div>Teléfono: ${order.customerPhone}</div>` : ''}
            ${order.customerDni ? `<div>DNI: ${order.customerDni}</div>` : ''}
          </div>
          
          <div class="items">
            <div style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px;">
              <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span>PRODUCTO</span>
                <span style="width: 30px; text-align: center;">CANT</span>
                <span style="width: 60px; text-align: right;">TOTAL</span>
              </div>
            </div>
            ${order.orderItems.map(item => `
              <div class="item">
                <span class="item-name">${item.product.name}</span>
                <span class="item-qty">${item.quantity}</span>
                <span class="item-price">S/ ${Number(item.subtotal).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="total-section">
            <div class="total">TOTAL: ${systemConfig.currency} ${Number(order.totalAmount).toFixed(2)}</div>
          </div>
          
          ${order.notes ? `
            <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">
              <strong>Notas:</strong><br>
              ${order.notes}
            </div>
          ` : ''}
          
          <div class="footer">
            <div>Gracias por su preferencia!</div>
            <div>Vuelva pronto</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(receiptContent)
    printWindow.document.close()
    setIsGenerating(false)
  }

  const generateInvoice = () => {
    if (!systemConfig) return
    
    setIsGenerating(true)
    
    // Crear ventana de impresión para factura
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para imprimir')
      setIsGenerating(false)
      return
    }

    const invoiceContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura - Pedido #${order.orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .company-info {
              flex: 1;
            }
            .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .invoice-info {
              text-align: right;
              flex: 1;
            }
            .invoice-title {
              font-size: 18px;
              font-weight: bold;
              background: #f0f0f0;
              padding: 10px;
              border: 1px solid #000;
              margin-bottom: 10px;
            }
            .customer-info {
              margin-bottom: 20px;
              border: 1px solid #ccc;
              padding: 15px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            .items-table th {
              background: #f0f0f0;
              font-weight: bold;
            }
            .items-table .qty,
            .items-table .price,
            .items-table .total {
              text-align: right;
            }
            .totals {
              float: right;
              width: 300px;
              border: 1px solid #000;
            }
            .totals table {
              width: 100%;
              border-collapse: collapse;
            }
            .totals td {
              padding: 8px;
              border-bottom: 1px solid #ccc;
            }
            .totals .total-row {
              font-weight: bold;
              background: #f0f0f0;
            }
            .footer {
              clear: both;
              margin-top: 40px;
              text-align: center;
              border-top: 1px solid #ccc;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <div class="company-name">${systemConfig.companyName}</div>
              ${systemConfig.companyRuc ? `<div>RUC: ${systemConfig.companyRuc}</div>` : ''}
              ${systemConfig.companyAddress ? `<div>${systemConfig.companyAddress}</div>` : ''}
              ${systemConfig.companyPhone ? `<div>Teléfono: ${systemConfig.companyPhone}</div>` : ''}
            </div>
            <div class="invoice-info">
              <div class="invoice-title">FACTURA</div>
              <div><strong>N°:</strong> F001-${order.orderNumber.toString().padStart(8, '0')}</div>
              <div><strong>Fecha:</strong> ${new Date(order.createdAt).toLocaleDateString('es-PE')}</div>
              <div><strong>Hora:</strong> ${new Date(order.createdAt).toLocaleTimeString('es-PE')}</div>
            </div>
          </div>
          
          <div class="customer-info">
            <h3>DATOS DEL CLIENTE</h3>
            <div><strong>Nombre/Razón Social:</strong> ${order.customerName || 'Cliente General'}</div>
            <div><strong>RUC/DNI:</strong> ${order.customerDni || '99999999'}</div>
            ${order.customerPhone ? `<div><strong>Teléfono:</strong> ${order.customerPhone}</div>` : ''}
            <div><strong>Mesa:</strong> ${order.table ? `Mesa ${order.table.number}` : 'Para llevar'}</div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>DESCRIPCIÓN</th>
                <th class="qty">CANT.</th>
                <th class="price">P. UNIT.</th>
                <th class="total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${order.orderItems.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td class="qty">${item.quantity}</td>
                  <td class="price">${systemConfig.currency} ${Number(item.unitPrice).toFixed(2)}</td>
                  <td class="total">${systemConfig.currency} ${Number(item.subtotal).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <table>
              <tr>
                 <td>Subtotal:</td>
                 <td style="text-align: right;">${systemConfig.currency} ${(Number(order.totalAmount) / (1 + systemConfig.taxRate)).toFixed(2)}</td>
               </tr>
               <tr>
                 <td>IGV (${(systemConfig.taxRate * 100).toFixed(0)}%):</td>
                 <td style="text-align: right;">${systemConfig.currency} ${(Number(order.totalAmount) - (Number(order.totalAmount) / (1 + systemConfig.taxRate))).toFixed(2)}</td>
               </tr>
              <tr class="total-row">
                <td>TOTAL:</td>
                <td style="text-align: right;">${systemConfig.currency} ${Number(order.totalAmount).toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          ${order.notes ? `
            <div style="clear: both; margin-top: 20px; border: 1px solid #ccc; padding: 10px;">
              <strong>Observaciones:</strong><br>
              ${order.notes}
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Gracias por su preferencia</p>
            <p>Esta factura es válida como comprobante de pago</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(invoiceContent)
    printWindow.document.close()
    setIsGenerating(false)
  }

  // Solo mostrar el botón para pedidos completados QUE TENGAN COMPROBANTE
  if (order.status !== 'COMPLETED' || !order.invoice) {
    return null
  }

  if (!systemConfig) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Printer className="h-4 w-4 mr-2" />
        Cargando...
      </Button>
    )
  }

  // Si tiene factura, mostrar solo la opción correspondiente al tipo de comprobante
  if (order.invoice) {
    const invoiceType = order.invoice.type
    
    if (invoiceType === 'BOLETA') {
      return (
        <Button 
          variant={variant} 
          size={size}
          disabled={isGenerating}
          onClick={generateReceipt}
          className={compact ? "h-7 px-2 text-xs" : ""}
        >
          <Receipt className={compact ? "h-3 w-3" : "h-4 w-4"} />
          {!compact && <span className="ml-2">{isGenerating ? 'Generando...' : 'Imprimir Boleta'}</span>}
          {compact && isGenerating && <span className="ml-1 text-xs">...</span>}
        </Button>
      )
    }
    
    if (invoiceType === 'FACTURA') {
      return (
        <Button 
          variant={variant} 
          size={size}
          disabled={isGenerating}
          onClick={generateInvoice}
          className={compact ? "h-7 px-2 text-xs" : ""}
        >
          <FileText className={compact ? "h-3 w-3" : "h-4 w-4"} />
          {!compact && <span className="ml-2">{isGenerating ? 'Generando...' : 'Imprimir Factura'}</span>}
          {compact && isGenerating && <span className="ml-1 text-xs">...</span>}
        </Button>
      )
    }
  }

  // Este caso ya no debería ocurrir porque solo mostramos el botón si hay invoice
  return null
}