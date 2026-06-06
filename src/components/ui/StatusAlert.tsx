import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, CheckCircle2, Info, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'success' | 'warning' | 'error' | 'info'

const variantStyles: Record<AlertVariant, {
  wrapper: string
  icon: string
  iconBg: string
  title: string
  DefaultIcon: LucideIcon
}> = {
  success: {
    wrapper: 'bg-emerald-500/10 border-emerald-500/20',
    icon: 'text-emerald-500',
    iconBg: 'bg-emerald-500/15',
    title: 'text-emerald-600 dark:text-emerald-400',
    DefaultIcon: CheckCircle2,
  },
  warning: {
    wrapper: 'bg-amber-500/10 border-amber-500/20',
    icon: 'text-amber-500',
    iconBg: 'bg-amber-500/15',
    title: 'text-amber-600 dark:text-amber-400',
    DefaultIcon: AlertCircle,
  },
  error: {
    wrapper: 'bg-red-500/10 border-red-500/20',
    icon: 'text-red-500',
    iconBg: 'bg-red-500/15',
    title: 'text-red-600 dark:text-red-400',
    DefaultIcon: AlertCircle,
  },
  info: {
    wrapper: 'bg-blue-500/10 border-blue-500/20',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-500/15',
    title: 'text-blue-600 dark:text-blue-400',
    DefaultIcon: Info,
  },
  // Alias específico para Atención/ShieldAlert:
}

interface StatusAlertProps {
  variant: AlertVariant
  title: string
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  pulse?: boolean
  className?: string
}

export function StatusAlert({
  variant,
  title,
  description,
  icon: IconProp,
  action,
  pulse = false,
  className,
}: StatusAlertProps) {
  const styles = variantStyles[variant]
  const Icon = IconProp ?? styles.DefaultIcon

  return (
    <div
      className={cn(
        'w-full border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
        'animate-in slide-in-from-top duration-500',
        styles.wrapper,
        className,
      )}
    >
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <div className={cn('p-2 rounded-xl shrink-0', styles.iconBg, pulse && 'animate-pulse')}>
          <Icon className={cn('w-5 h-5', styles.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[10px] font-black uppercase tracking-widest leading-tight', styles.title)}>
            {title}
          </p>
          {description && (
            <div className={cn('text-xs font-medium mt-0.5', styles.icon, 'opacity-75')}>
              {description}
            </div>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0 w-full sm:w-auto">
          {action}
        </div>
      )}
    </div>
  )
}

// Variante específica para alertas de facturación/datos pendientes
export function PendingAlert({
  count,
  entity = 'pedidos',
  onAction,
  actionLabel = 'Gestionar Ahora',
  className,
}: {
  count: number
  entity?: string
  onAction: () => void
  actionLabel?: string
  className?: string
}) {
  if (count === 0) return null

  return (
    <StatusAlert
      variant="warning"
      icon={ShieldAlert}
      title="Atención: Facturación Pendiente"
      description={
        <>Tienes <strong>{count}</strong> {entity} sin comprobante de pago.</>
      }
      pulse
      action={
        <button
          onClick={onAction}
          className="w-full sm:w-auto h-9 px-6 rounded-xl font-black uppercase tracking-widest text-[9px] border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all"
        >
          {actionLabel}
        </button>
      }
      className={className}
    />
  )
}
