import React from 'react';
import { LucideIcon } from 'lucide-react';
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
    bg: 'bg-blue-100',
    text: 'text-blue-600',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
  },
  teal: {
    bg: 'bg-teal-100',
    text: 'text-teal-600',
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
    <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-200/50 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {label}
          </p>
          <div className="flex flex-col">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded" />
              ) : (
                value
              )}
            </p>
            {subValue && !loading && (
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium mt-0.5 truncate">
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
