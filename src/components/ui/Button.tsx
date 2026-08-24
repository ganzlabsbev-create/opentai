"use client";

import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "solid" | "accent" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
}

const variantClasses: Record<Variant, string> = {
  solid: "bg-text text-bg",
  accent: "bg-accent text-accent-text",
  outline: "bg-transparent text-text border border-border",
  ghost: "bg-transparent text-text-muted",
  danger: "bg-danger-soft text-danger",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-[12.5px] px-3 py-1.5",
  md: "text-sm px-4 py-2.5",
};

export function Button({ variant = "solid", size = "md", icon: Icon, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
    </button>
  );
}
