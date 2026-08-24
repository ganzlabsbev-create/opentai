"use client";

import { ChevronDown } from "lucide-react";
import type { MesonModelInfo } from "@/ai/meson/types";

interface MesonModelPickerProps {
  models: MesonModelInfo[] | null;
  selected: string;
  onChange: (mesonId: string) => void;
  error: string | null;
}

export function MesonModelPicker({ models, selected, onChange, error }: MesonModelPickerProps) {
  if (error) return <p className="mb-3 text-[12.5px] text-danger">{error}</p>;
  if (!models) return <p className="mb-3 text-[12.5px] text-text-muted">กำลังโหลดรายชื่อโมเดล…</p>;
  if (models.length === 0) return <p className="mb-3 text-[12.5px] text-text-muted">ยังไม่มีโมเดลในหมวดนี้</p>;

  const current = models.find((m) => m.mesonId === selected);

  return (
    <div className="mb-3.5">
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-border bg-surface-sunk px-3 py-2.5 pr-8 text-[13.5px] text-text outline-none"
        >
          {models.map((m) => (
            <option key={m.mesonId} value={m.mesonId}>
              {m.mesonName}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
      </div>
      {current && <p className="mt-1.5 text-[11.5px] text-text-muted">{current.blurb}</p>}
    </div>
  );
}
