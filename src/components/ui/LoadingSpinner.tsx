import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
  className?: string
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
}

export function LoadingSpinner({
  message,
  size = 'md',
  fullPage = false,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('text-center', className)}>
      <div className={cn('relative mx-auto mb-4', sizes[size])}>
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      {message && (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 animate-pulse">
          {message}
        </p>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-in fade-in duration-300">
        {spinner}
      </div>
    )
  }

  return spinner
}
