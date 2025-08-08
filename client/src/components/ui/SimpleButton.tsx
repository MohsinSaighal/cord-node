import React from 'react';
import { cn } from '@/lib/utils';

interface SimpleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white',
    secondary: 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border border-slate-600/50',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-6 py-3 text-lg h-12'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'rounded-lg font-medium transition-all duration-300 hover-lift',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
        'focus:outline-none focus:ring-2 focus:ring-green-500/50',
        variants[variant],
        sizes[size],
        loading && 'animate-pulse',
        className
      )}
    >
      <div className="flex items-center justify-center space-x-2">
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        <span>{children}</span>
      </div>
    </button>
  );
};