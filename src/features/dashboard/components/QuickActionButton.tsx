import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ActionColor = 'orange' | 'purple' | 'indigo' | 'pink' | 'teal' | 'gray' | 'blue';

interface QuickActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color: ActionColor;
  disabled?: boolean;
}

const colorThemes: Record<ActionColor, string> = {
  orange: 'hover:bg-orange-50 hover:border-orange-200 text-orange-500',
  purple: 'hover:bg-purple-50 hover:border-purple-200 text-purple-500',
  indigo: 'hover:bg-indigo-50 hover:border-indigo-200 text-indigo-500',
  pink: 'hover:bg-pink-50 hover:border-pink-200 text-pink-500',
  teal: 'hover:bg-teal-50 hover:border-teal-200 text-teal-500',
  gray: 'hover:bg-gray-50 hover:border-gray-200 text-gray-500',
  blue: 'hover:bg-blue-50 hover:border-blue-200 text-blue-500',
};

const iconColors: Record<ActionColor, string> = {
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  indigo: 'text-indigo-500',
  pink: 'text-pink-500',
  teal: 'text-teal-500',
  gray: 'text-gray-500',
  blue: 'text-blue-500',
};

export const QuickActionButton = ({
  label,
  icon: Icon,
  onClick,
  color,
  disabled = false
}: QuickActionButtonProps) => {
  const getHoverShadow = () => {
    switch(color) {
      case 'orange': return 'hover:shadow-orange-500/20';
      case 'purple': return 'hover:shadow-purple-500/20';
      case 'indigo': return 'hover:shadow-indigo-500/20';
      case 'pink': return 'hover:shadow-pink-500/20';
      case 'teal': return 'hover:shadow-teal-500/20';
      case 'blue': return 'hover:shadow-blue-500/20';
      default: return 'hover:shadow-gray-500/20';
    }
  }

  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={cn(
        "h-16 sm:h-20 p-1 sm:p-2 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all duration-300 rounded-xl sm:rounded-2xl group",
        "bg-card/40 backdrop-blur-md border-border/50",
        "hover:bg-foreground/5 hover:border-foreground/20 hover:scale-[1.02] shadow-sm",
        getHoverShadow(),
        disabled && "opacity-50 grayscale pointer-events-none"
      )}
      disabled={disabled}
    >
      <div className={cn(
        "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
        "bg-background/80 dark:bg-black/40 shadow-sm border border-border/30",
        color === 'orange' && "text-orange-500",
        color === 'purple' && "text-purple-500",
        color === 'indigo' && "text-indigo-500",
        color === 'pink' && "text-pink-500",
        color === 'teal' && "text-teal-500",
        color === 'gray' && "text-gray-500",
        color === 'blue' && "text-blue-500",
      )}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <span className="text-[9px] sm:text-[11px] font-black text-center text-foreground uppercase tracking-tight sm:tracking-widest opacity-80 group-hover:opacity-100 transition-opacity truncate max-w-full px-1">
        {label}
      </span>
    </Button>
  );
};

export default QuickActionButton;
