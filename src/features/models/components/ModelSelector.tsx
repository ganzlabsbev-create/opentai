"use client";

import { ArrowUpRight, CircleCheck } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { deriveModels } from "@/ai/registry/registry";
import { useModelSelection } from "@/features/models/store/ModelSelectionProvider";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { MESON_STUDIO_LINKS } from "@/features/meson/lib/studioLinks";

export function ModelSelector() {
  const toast = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const models = useMemo(() => deriveModels(settings), [settings]);

  return (
    <>
      <div className="mb-1.5 mt-5 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">โมเดล</div>
      {models.map((m, i) => (
        <div key={m.id} className={`flex items-center justify-between py-2.5 ${i < models.length - 1 ? "border-b border-border" : ""}`}>
          <div>
            <div className="text-[13.5px] font-medium text-text">{m.name}</div>
            <div className="mt-0.5 text-[11.5px] text-text-muted">
              {m.capability} · {m.context}
              {!m.ready ? " · ต้องใช้ API key" : ""}
            </div>
          </div>
          {selectedModel === m.name ? (
            <CircleCheck size={16} className="text-accent" />
          ) : (
            <button
              disabled={!m.ready}
              onClick={() => {
                setSelectedModel(m.name);
                toast(`ตั้ง ${m.name} เป็นค่าเริ่มต้น`);
              }}
              className={`border-0 bg-none text-xs ${m.ready ? "cursor-pointer text-accent" : "cursor-not-allowed text-text-muted"}`}
            >
              เลือก
            </button>
          )}
        </div>
      ))}

      {/*
       * Meson 3.x–8.x aren't text-chat models (separate request/response
       * shapes, own /api/meson/* routes) so they can't be "the default chat
       * model" — link out to each category's Studio page instead. Embedding
       * (7.x) has no Studio UI yet, so it's excluded here too.
       */}
      <div className="mb-1.5 mt-5 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">เครื่องมือ Meson อื่นๆ</div>
      {MESON_STUDIO_LINKS.map((tool, i) => (
        <button
          key={tool.href}
          onClick={() => router.push(tool.href)}
          className={`flex w-full items-center justify-between py-2.5 text-left ${i < MESON_STUDIO_LINKS.length - 1 ? "border-b border-border" : ""}`}
        >
          <div>
            <div className="text-[13.5px] font-medium text-text">{tool.title}</div>
            <div className="mt-0.5 text-[11.5px] text-text-muted">{tool.desc}</div>
          </div>
          <ArrowUpRight size={14} className="text-text-muted" />
        </button>
      ))}
    </>
  );
}
