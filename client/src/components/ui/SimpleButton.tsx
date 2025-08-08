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
    primary: 'text-white shadow-lg hover:shadow-xl transform hover:scale-105',
    secondary: 'border text-[#CCCCCC] hover:text-[#FFFFFF]',
    danger: 'text-white shadow-lg hover:shadow-xl transform hover:scale-105'
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
        'focus:outline-none focus:ring-2',
        variants[variant],
        sizes[size],
        loading && 'animate-pulse',
        className
      )}
      style={{
        background: variant === 'primary' ? 'var(--gradient-brand)' 
                 : variant === 'danger' ? 'linear-gradient(135deg, #FF355E 0%, #FF6B6B 100%)'
                 : 'var(--bg-tertiary)',
        borderColor: variant === 'secondary' ? 'var(--brand-primary)' : 'transparent',
        boxShadow: variant !== 'secondary' ? '0 4px 15px rgba(106, 90, 205, 0.3)' : 'none'
      }}
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