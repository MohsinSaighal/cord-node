import React from 'react';
import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  from?: string;
  to?: string;
  animated?: boolean;
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className,
  from = 'from-green-400',
  to = 'to-emerald-600',
  animated = false
}) => {
  return (
    <span
      className={cn(
        `bg-gradient-to-r ${from} ${to} bg-clip-text text-transparent`,
        animated && "animate-gradient bg-300% bg-clip-text",
        className
      )}
    >
      {children}
    </span>
  );
};