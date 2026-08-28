"use client";

import { Check, ArrowUpRight, Eye } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { deriveModels } from "@/ai/registry/registry";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { MESON_STUDIO_LINKS } from "@/features/meson/lib/studioLinks";

interface ModelPickerSheetProps {
  open: boolean;
  onClose: () => void;
  model: string;
  setModel: (name: string) => void;
}

export function ModelPickerSheet({ open, onClose, model, setModel }: ModelPickerSheetProps) {
  const router = useRouter();
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
              <div className="flex items-center gap-1 text-[13.5px] font-medium text-text">
                {m.name}
                {m.supportsVision && <Eye size={11} className="text-text-muted" />}
              </div>
              <div className="text-[11.5px] text-text-muted">
                {m.capability} · {m.context}
              </div>
            </div>
            {model === m.name && <Check size={15} className="text-accent" />}
          </button>
        ))}

        {/*
         * Meson 3.x–8.x (image/live/tts/video/embedding/robotics) aren't text-chat
         * models — they use their own request/response shapes via dedicated
         * /api/meson/* routes, not /api/meson/chat. Selecting one here can't set
         * it as the chat model, so these route to their Studio page instead.
         * Embedding (7.x) has no standalone Studio UI (backend/RAG use only),
         * so it's intentionally left out of this list.
         */}
        <div className="mt-1 border-t border-border pt-1">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            เครื่องมือ Meson อื่นๆ
          </div>
          {MESON_STUDIO_LINKS.map((tool) => (
            <button
              key={tool.href}
              onClick={() => {
                onClose();
                router.push(tool.href);
              }}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-2.5"
            >
              <div className="text-left">
                <div className="text-[13.5px] font-medium text-text">{tool.title}</div>
                <div className="text-[11.5px] text-text-muted">{tool.desc}</div>
              </div>
              <ArrowUpRight size={14} className="text-text-muted" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
