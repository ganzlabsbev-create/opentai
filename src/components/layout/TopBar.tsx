"use client";

import { ArrowLeft, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";

interface TopBarProps {
  title: string;
  /** Present on the chat root route — opens the conversations drawer. */
  onMenu?: () => void;
  /** Present on every other route — navigates back. */
  onBack?: () => void;
  right?: ReactNode;
}

export function TopBar({ title, onMenu, onBack, right }: TopBarProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between bg-surface px-1.5">
      <div className="flex min-w-[40px] items-center gap-1">
        {onBack ? (
          <IconButton icon={ArrowLeft} onClick={onBack} title="กลับ" />
        ) : (
          <IconButton icon={Menu} onClick={onMenu} title="เมนู" />
        )}
      </div>
      <div className="text-[14.5px] font-semibold text-text">{title}</div>
      <div className="flex min-w-[40px] items-center justify-end gap-1">{right}</div>
    </header>
  );
}
