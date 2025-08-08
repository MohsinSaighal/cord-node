import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  delay = 0,
  hover = true,
  glow = false,
  onClick
}) => {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10",
        "backdrop-blur-sm transition-all duration-300 animate-slide-up hover-lift",
        glow && "animate-pulse-glow",
        onClick && "cursor-pointer",
        className
      )}
      style={{ animationDelay: `${delay * 100}ms` }}
      onClick={onClick}
    >
      {glow && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 blur-xl opacity-50" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};