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
      className={`group w-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${
        isPrimary
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-transparent'
          : 'bg-white/70 backdrop-blur-sm hover:bg-white/90 border-gray-200/50 text-gray-900'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h3 className={`text-base sm:text-lg font-semibold mb-1 ${!isPrimary ? 'text-gray-900' : ''}`}>
            {title}
          </h3>
          <p className={`text-xs sm:text-sm ${isPrimary ? 'text-blue-100' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
          isPrimary
            ? 'bg-white/20 group-hover:bg-white/30'
            : 'bg-gray-100 group-hover:bg-gray-200'
        }`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${!isPrimary ? 'text-gray-600' : 'text-white'}`} />
        </div>
      </div>
    </button>
  );
};

export default ActionCard;
