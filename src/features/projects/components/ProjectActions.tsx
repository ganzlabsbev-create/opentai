"use client";

import { Bug, GitCompare, Link2, ScrollText, Sparkles, Wand2, type LucideIcon } from "lucide-react";

interface ActionDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

const PROJECT_ACTIONS: ActionDef[] = [
  { id: "analyze", label: "วิเคราะห์โปรเจกต์", icon: Sparkles },
  { id: "review", label: "รีวิวโค้ด", icon: ScrollText },
  { id: "errors", label: "หาข้อผิดพลาด", icon: Bug },
  { id: "deps", label: "หา dependency", icon: Link2 },
  { id: "fix", label: "แนะนำการแก้ไข", icon: Wand2 },
  { id: "patch", label: "สร้าง patch", icon: GitCompare },
];

interface ProjectActionsProps {
  onAction: (id: string) => void;
}

export function ProjectActions({ onAction }: ProjectActionsProps) {
  return (
    <div className="mb-4.5 grid grid-cols-3 gap-2">
      {PROJECT_ACTIONS.map((a) => (
        <button
          key={a.id}
          onClick={() => onAction(a.id)}
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-transparent px-1.5 py-3 text-center"
        >
          <a.icon size={16} className="text-accent" />
          <span className="text-[11px] text-text">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
