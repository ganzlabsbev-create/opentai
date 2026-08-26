"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { CATEGORY_LABELS_TH, PROVIDER_LABELS, type MesonCategory, type MesonModelInfo } from "@/ai/meson/types";

const STATUS_STYLE: Record<string, string> = {
  stable: "bg-green-100 text-green-800",
  preview: "bg-amber-100 text-amber-800",
  experimental: "bg-orange-100 text-orange-800",
  unavailable: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-600",
};

const STATUS_LABEL_TH: Record<string, string> = {
  stable: "เสถียร",
  preview: "พรีวิว",
  experimental: "ทดลอง",
  unavailable: "ใช้ไม่ได้แล้ว",
  unknown: "ไม่ทราบสถานะ",
};

function groupByCategory(models: MesonModelInfo[]): [MesonCategory, MesonModelInfo[]][] {
  const order: MesonCategory[] = ["chat", "pro", "image", "live", "tts", "video", "embedding", "robotics"];
  return order
    .map((cat) => [cat, models.filter((m) => m.category === cat)] as [MesonCategory, MesonModelInfo[]])
    .filter(([, list]) => list.length > 0);
}

/**
 * Read-only. There is intentionally no edit UI here — Meson↔Gemini mapping
 * lives in registry.config.ts and changing it requires a redeploy (see
 * /src/ai/meson/registry.config.ts for why: Vercel's runtime filesystem is
 * read-only, and a DB-backed mapping was explicitly decided against).
 */
export default function MesonAdminPage() {
  const router = useRouter();
  const [models, setModels] = useState<MesonModelInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/meson/models?reveal=1")
      .then((r) => r.json())
      .then((d) => setModels(d.models))
      .catch(() => setError("โหลดสถานะโมเดลไม่สำเร็จ"));
  }, []);

  return (
    <>
      <TopBar title="สถานะ Meson Registry" onBack={() => router.push("/settings")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <p className="mb-3 text-[12.5px] text-text-muted">
          หน้านี้แสดงผลอย่างเดียว — แก้ mapping ได้ที่ <code>registry.config.ts</code> ในโค้ดแล้ว deploy ใหม่เท่านั้น
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!models && !error && <p className="text-sm text-text-muted">กำลังโหลด…</p>}

        {models &&
          groupByCategory(models).map(([category, list]) => (
            <section key={category} className="mb-5">
              <h2 className="mb-2 text-[13px] font-semibold text-text">{CATEGORY_LABELS_TH[category]}</h2>
              <div className="space-y-1.5">
                {list.map((m) => (
                  <div key={m.mesonId} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-medium text-text">{m.mesonName}</span>
                        <span className="rounded bg-surface-sunk px-1.5 py-0.5 text-[10.5px] font-medium text-text-muted">
                          {PROVIDER_LABELS[m.providerId]}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-text-muted">
                        {m.blurb}
                        {m.providerModelId && <span className="ml-1.5 opacity-70">· {m.providerModelId}</span>}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[m.status]}`}>
                      {STATUS_LABEL_TH[m.status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    </>
  );
}
