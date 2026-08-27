"use client";

import { ArrowUpRight, CircleCheck } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
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
  const hasOwnGeminiKey = Boolean(settings.apiKeys.gemini && settings.apiKeys.gemini.trim().length > 0);

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
              const showByokBadge = hasOwnGeminiKey && entry.providerId === "gemini";
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
                    {showByokBadge && (
                      <span className="rounded-full bg-accent-soft px-1.5 py-[1px] text-[10px] font-medium text-accent">
                        ใช้กับ API นี้ได้
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
    </>
  );
}
