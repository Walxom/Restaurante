import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'teal';
  loading?: boolean;
}

const colorThemes = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-500/20',
    text: 'text-green-600 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
  },
  teal: {
    bg: 'bg-teal-100 dark:bg-teal-500/20',
    text: 'text-teal-600 dark:text-teal-400',
  }
};

export const StatCard = ({
  label,
  value,
  subValue,
  icon: Icon,
  color,
  loading = false
}: StatCardProps) => {
  const theme = colorThemes[color];

  return (
    <div className="bg-card/40 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-border/50 hover:border-border hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold text-foreground/60 uppercase tracking-widest mb-1.5">
            {label}
          </p>
          <div className="flex flex-col">
            <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-muted animate-pulse rounded" />
              ) : (
                value
              )}
            </p>
            {subValue && !loading && (
              <p className="text-[10px] sm:text-xs text-foreground/50 font-medium mt-1 truncate">
                {subValue}
              </p>
            )}
          </div>
        </div>
        
        <div className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm",
          theme.bg
        )}>
          <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", theme.text)} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
