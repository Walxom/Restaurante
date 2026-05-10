import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export const ActionCard = ({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'primary',
  className = ''
}: ActionCardProps) => {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      className={`group w-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-sm ${
        isPrimary
          ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white border-transparent shadow-blue-500/20'
          : 'bg-card/40 backdrop-blur-md hover:bg-card/60 border-border/50 text-foreground'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h3 className={`text-base sm:text-lg font-bold mb-1 ${!isPrimary ? 'text-foreground' : 'text-white'}`}>
            {title}
          </h3>
          <p className={`text-xs sm:text-sm leading-relaxed ${isPrimary ? 'text-blue-100/80' : 'text-foreground/70'}`}>
            {description}
          </p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${
          isPrimary
            ? 'bg-white/20 group-hover:bg-white/30 group-hover:rotate-6'
            : 'bg-muted dark:bg-slate-950/50 group-hover:bg-accent group-hover:rotate-6'
        }`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${!isPrimary ? 'text-muted-foreground group-hover:text-foreground' : 'text-white'}`} />
        </div>
      </div>
    </button>
  );
};

export default ActionCard;
