"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl";
    
    const variants = {
      primary: "bg-sage-600 text-white hover:bg-sage-700 focus:ring-sage-500 shadow-lg shadow-sage-600/25 hover:shadow-sage-600/40 hover:-translate-y-0.5",
      secondary: "bg-cream-200 text-sage-800 hover:bg-cream-300 focus:ring-cream-400",
      outline: "border-2 border-sage-300 text-sage-700 hover:bg-sage-50 focus:ring-sage-400",
      ghost: "text-sage-600 hover:bg-sage-100 focus:ring-sage-400",
      destructive: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 shadow-lg shadow-red-500/25",
    };
    
    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-4 py-2.5 text-sm gap-2",
      lg: "px-6 py-3 text-base gap-2",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };

