import React from 'react'
import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon: LucideIcon
  color: 'blue' | 'orange' | 'green' | 'purple' | 'teal'
  loading?: boolean
}

// Colores de acento — saturados, legibles tanto en light como dark
const palette: Record<StatCardProps['color'], string> = {
  blue:   'oklch(0.55 0.18 230)',
  orange: 'oklch(0.62 0.20 40)',
  green:  'oklch(0.55 0.18 155)',
  purple: 'oklch(0.58 0.20 295)',
  teal:   'oklch(0.55 0.17 185)',
}

export const StatCard = ({ label, value, subValue, icon: Icon, color, loading = false }: StatCardProps) => {
  const accent = palette[color]

  return (
    <div className="ocean-stat-card relative rounded-2xl overflow-hidden cursor-default">
      {/* Barra de acento izquierda */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{
          background: `linear-gradient(to bottom, ${accent}, ${accent}66)`,
          boxShadow: `0 0 14px ${accent}44`,
        }}
      />

      {/* Orb de resplandor — esquina superior derecha */}
      <div
        className="absolute top-0 right-0 w-36 h-36 pointer-events-none -translate-y-12 translate-x-10"
        style={{ background: `radial-gradient(circle at center, ${accent}14, transparent 65%)` }}
      />

      <div className="p-5 pl-[22px]">
        {/* Etiqueta */}
        <p
          className="text-[10px] font-bold uppercase mb-3 text-muted-foreground"
          style={{ letterSpacing: '0.18em' }}
        >
          {label}
        </p>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="h-8 w-20 rounded-lg animate-pulse bg-muted" />
            ) : (
              <p
                className="text-3xl font-black leading-none truncate text-foreground"
                style={{
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  letterSpacing: '-0.03em',
                }}
              >
                {value}
              </p>
            )}
            {subValue && !loading && (
              <p className="text-xs mt-1.5 truncate text-muted-foreground">
                {subValue}
              </p>
            )}
          </div>

          {/* Ícono con fondo de acento */}
          <div
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}18` }}
          >
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatCard
