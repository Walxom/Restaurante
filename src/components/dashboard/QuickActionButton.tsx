import React from 'react';
import { LucideIcon } from 'lucide-react';
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
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={cn(
        "h-16 sm:h-18 lg:h-20 flex flex-col items-center justify-center gap-1 sm:gap-2 transition-all duration-200 rounded-lg sm:rounded-xl group",
        colorThemes[color]
      )}
      disabled={disabled}
    >
      <Icon className={cn(
        "h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform duration-200",
        iconColors[color]
      )} />
      <span className="text-xs sm:text-sm font-medium text-center text-gray-700 group-hover:text-inherit">
        {label}
      </span>
    </Button>
  );
};

export default QuickActionButton;
