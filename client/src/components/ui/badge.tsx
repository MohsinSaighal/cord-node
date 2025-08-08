import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantClasses = {
    default: "border-transparent bg-green-500 text-white hover:bg-green-600",
    secondary: "border-transparent bg-slate-600 text-slate-100 hover:bg-slate-700",
    destructive: "border-transparent bg-red-500 text-white hover:bg-red-600",
    outline: "text-slate-300 border-slate-600"
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variantClasses[variant],
        className
      )} 
      {...props} 
    />
  );
}

export { Badge };