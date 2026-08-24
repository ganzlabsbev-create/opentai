import type { ReactNode } from "react";

interface SettingsRowProps {
  label: string;
  desc?: string;
  children: ReactNode;
}

export function SettingsRow({ label, desc, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-0.5 py-3">
      <div>
        <div className="text-[13.5px] text-text">{label}</div>
        {desc && <div className="mt-px text-[11.5px] text-text-muted">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsSectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1 mt-5 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">{children}</div>;
}
