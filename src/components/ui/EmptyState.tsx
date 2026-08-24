import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  desc?: string;
}

export function EmptyState({ icon: Icon, title, desc }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-8 py-20 text-center">
      <Icon size={22} className="text-text-muted" />
      <div className="text-[14.5px] font-semibold text-text">{title}</div>
      {desc && <div className="max-w-[280px] text-[13px] text-text-muted">{desc}</div>}
    </div>
  );
}
