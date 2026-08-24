"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import { deriveModels } from "@/ai/registry/registry";
import { useSettings } from "@/features/settings/store/SettingsProvider";

interface ModelPickerSheetProps {
  open: boolean;
  onClose: () => void;
  model: string;
  setModel: (name: string) => void;
}

export function ModelPickerSheet({ open, onClose, model, setModel }: ModelPickerSheetProps) {
  const { settings } = useSettings();
  const models = useMemo(() => deriveModels(settings), [settings]);

  if (!open) return null;

  const ready = models.filter((m) => m.ready);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[55] bg-overlay" />
      <div className="fixed left-3 right-3 top-[60px] z-[56] mx-auto max-w-[340px] rounded-2xl border border-border bg-surface p-1.5">
        {ready.length === 0 && (
          <div className="px-2.5 py-3 text-center text-[12.5px] text-text-muted">
            ยังไม่มีโมเดลที่พร้อมใช้งาน ไปที่หน้าโมเดลเพื่อเชื่อมต่อ provider
          </div>
        )}
        {ready.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setModel(m.name);
              onClose();
            }}
            className={`flex w-full items-center justify-between rounded-md px-2.5 py-2.5 ${
              model === m.name ? "bg-surface-sunk" : "bg-transparent"
            }`}
          >
            <div className="text-left">
              <div className="text-[13.5px] font-medium text-text">{m.name}</div>
              <div className="text-[11.5px] text-text-muted">
                {m.capability} · {m.context}
              </div>
            </div>
            {model === m.name && <Check size={15} className="text-accent" />}
          </button>
        ))}
      </div>
    </>
  );
}
