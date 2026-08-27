"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/features/settings/store/SettingsProvider";

interface QuotaResponse {
  loggedIn: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

function formatResetIn(resetInSeconds: number): string {
  if (resetInSeconds <= 0) return "ยังไม่เริ่มนับวันนี้";
  const hours = Math.floor(resetInSeconds / 3600);
  const minutes = Math.floor((resetInSeconds % 3600) / 60);
  return `รีเซ็ตในอีก ${hours} ชม. ${minutes} นาที`;
}

export function QuotaView() {
  const toast = useToast();
  const router = useRouter();
  const { settings } = useSettings();
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/meson/quota");
        if (!res.ok) throw new Error(`โหลดโควตาไม่สำเร็จ (${res.status})`);
        const data: QuotaResponse = await res.json();
        if (!cancelled) setQuota(data);
      } catch {
        if (!cancelled) toast("โหลดข้อมูลโควตาไม่สำเร็จ", "danger");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const hasOwnGeminiKey = Boolean(settings.apiKeys.gemini && settings.apiKeys.gemini.trim().length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (!quota) {
    return <div className="py-8 text-center text-[13px] text-text-muted">ไม่สามารถโหลดข้อมูลโควตาได้</div>;
  }

  const pct = quota.limit > 0 ? Math.min(100, (quota.used / quota.limit) * 100) : 0;
  const barColor = pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-accent";

  return (
    <div className="py-2">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="text-text-muted">โควตา key กลาง</span>
          <span className="text-text">
            ใช้ไป {quota.used} / {quota.limit} ครั้งวันนี้
          </span>
        </div>
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-elevated">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-[11.5px] text-text-muted">{formatResetIn(quota.resetInSeconds)}</div>
      </div>

      {hasOwnGeminiKey && (
        <div className="mt-3 rounded-lg bg-accent-soft px-3.5 py-3 text-[12.5px] text-accent">
          คุณใส่ API key ของตัวเองแล้ว โควตานี้ไม่เกี่ยวกับคุณ — ใช้ได้ไม่จำกัด
        </div>
      )}

      {!quota.loggedIn && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-4">
          <div className="text-[13px] text-text">เข้าสู่ระบบด้วย GitHub เพื่อเพิ่มโควตาเป็น 25 ครั้ง/วัน</div>
          <Button size="sm" variant="accent" className="mt-3" onClick={() => router.push("/account")}>
            ไปหน้าบัญชี
          </Button>
        </div>
      )}
    </div>
  );
}
