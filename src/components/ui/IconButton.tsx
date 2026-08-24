"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  title?: string;
  size?: number;
  active?: boolean;
  className?: string;
}

export function IconButton({ icon: Icon, onClick, title, size = 18, active, className }: IconButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active ? "bg-accent-soft" : "bg-transparent",
        className
      )}
    >
      <Icon size={size} className={active ? "text-accent" : "text-text"} />
    </button>
  );
}
