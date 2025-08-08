import React from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
  trend?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  gradient,
  delay = 0,
  trend
}) => {
  return (
    <div
      className={cn(
        "relative rounded-xl p-6 overflow-hidden animate-slide-up hover-lift",
        "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
        "border border-slate-700/50 backdrop-blur-sm",
        "hover:border-slate-600/50 transition-all duration-300"
      )}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute inset-0 opacity-20 bg-gradient-to-br",
        gradient
      )} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br opacity-30",
            gradient
          )}>
            {icon}
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center text-xs px-2 py-1 rounded-full",
              trend > 0 ? "text-green-400 bg-green-500/20" : "text-red-400 bg-red-500/20"
            )}>
              <span className="mr-1">
                {trend > 0 ? '↗' : '↘'}
              </span>
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-3xl font-bold text-white">
            <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", gradient)}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          </div>
          <div className="text-slate-400 text-sm font-medium">{title}</div>
          {subtitle && (
            <div className="text-slate-500 text-xs">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};