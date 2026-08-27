"use client";

import { ArrowUpRight, CircleCheck } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { deriveModels } from "@/ai/registry/registry";
import { MESON_REGISTRY } from "@/ai/meson/registry.config";
import { useModelSelection } from "@/features/models/store/ModelSelectionProvider";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { MESON_CATEGORY_DISPLAY } from "@/features/models/lib/mesonCategoryDisplay";

const STABILITY_LABEL_TH: Record<string, string> = {
  preview: "พรีวิว",
  experimental: "ทดลอง",
};

export function ModelSelector() {
  const toast = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  const { selectedModel, setSelectedModel } = useModelSelection();

  // Raw BYOK Gemini models (the user's own key, direct to Google) — a
  // separate, older feature from the Meson catalog below. Filtered out of
  // `deriveModels` here since Meson's own chat/pro entries are now read
  // straight from MESON_REGISTRY instead, so the two aren't listed twice.
  const byokModels = useMemo(() => deriveModels(settings).filter((m) => m.provider === "gemini"), [settings]);

  const entriesByCategory = useMemo(() => {
    const map = new Map<string, typeof MESON_REGISTRY>();
    for (const entry of MESON_REGISTRY) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return map;
  }, []);

  return (
    <>
      {MESON_CATEGORY_DISPLAY.map((cat) => {
        const entries = entriesByCategory.get(cat.category) ?? [];
        if (entries.length === 0) return null;

        return (
          <div key={cat.category} className="mb-4">
            <div className="mb-1.5 mt-5 flex items-center justify-between">
              <div className="text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">
                Meson {cat.number} · {cat.shortLabel}
              </div>
              {cat.studioHref && (
                <button
                  onClick={() => router.push(cat.studioHref!)}
                  className="flex items-center gap-0.5 border-0 bg-none text-[11px] text-accent"
                >
                  เปิด Studio
                  <ArrowUpRight size={12} />
                </button>
              )}
            </div>

            {entries.map((entry, i) => {
              const stabilityTag = entry.declaredStability !== "stable" ? STABILITY_LABEL_TH[entry.declaredStability] : null;
              const isLast = i === entries.length - 1;
              const rowClasses = `flex items-center justify-between py-2.5 ${!isLast ? "border-b border-border" : ""}`;

              const info = (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13.5px] font-medium text-text">{entry.mesonName}</span>
                    {stabilityTag && (
                      <span className="rounded-full bg-warning-soft px-1.5 py-[1px] text-[10px] font-medium text-warning">
                        {stabilityTag}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-text-muted">{entry.blurb}</div>
                </div>
              );

              if (cat.selectable) {
                return (
                  <div key={entry.mesonId} className={rowClasses}>
                    {info}
                    {selectedModel === entry.mesonName ? (
                      <CircleCheck size={16} className="text-accent" />
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedModel(entry.mesonName);
                          toast(`ตั้ง ${entry.mesonName} เป็นค่าเริ่มต้น`);
                        }}
                        className="cursor-pointer border-0 bg-none text-xs text-accent"
                      >
                        เลือก
                      </button>
                    )}
                  </div>
                );
              }

              // Non-chat categories (image/live/tts/video/embedding/robotics)
              // aren't a selectable default chat model — tap through to the
              // category's Studio page when one exists, otherwise it's just
              // informational (embedding/7.x has no Studio UI).
              if (cat.studioHref) {
                return (
                  <button key={entry.mesonId} onClick={() => router.push(cat.studioHref!)} className={`w-full text-left ${rowClasses}`}>
                    {info}
                    <ArrowUpRight size={14} className="text-text-muted" />
                  </button>
                );
              }

              return (
                <div key={entry.mesonId} className={rowClasses}>
                  {info}
                </div>
              );
            })}
          </div>
        );
      })}

      {byokModels.length > 0 && (
        <>
          <div className="mb-1.5 mt-5 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">
            Gemini · BYOK ส่วนตัว
          </div>
          {byokModels.map((m, i) => (
            <div key={m.id} className={`flex items-center justify-between py-2.5 ${i < byokModels.length - 1 ? "border-b border-border" : ""}`}>
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
        </>
      )}
    </>
  );
}
