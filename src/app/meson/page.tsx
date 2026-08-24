"use client";

import { Bot, Clapperboard, Image as ImageIcon, Radio, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";

interface ToolLink {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

const TOOLS: ToolLink[] = [
  { href: "/meson/image", icon: ImageIcon, title: "สร้าง/แก้ไขรูปภาพ", desc: "Meson 3.x — สร้างรูปจาก prompt หรือแก้ไขรูปที่มี" },
  { href: "/meson/live", icon: Radio, title: "เสียงสด", desc: "Meson 4.x — สนทนาด้วยเสียงแบบเรียลไทม์" },
  { href: "/meson/tts", icon: Volume2, title: "แปลงข้อความเป็นเสียง", desc: "Meson 5.x — พิมพ์ข้อความ ฟังเป็นเสียงพูด" },
  { href: "/meson/video", icon: Clapperboard, title: "สร้างวิดีโอ", desc: "Meson 6.0 — สร้างวิดีโอจาก prompt" },
  { href: "/meson/robotics", icon: Bot, title: "หุ่นยนต์ / Physical AI", desc: "Meson 8.x — วิเคราะห์ภาพฉากสำหรับหุ่นยนต์" },
];

export default function MesonToolsPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="เครื่องมือ AI" onBack={() => router.push("/")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        {TOOLS.map((t) => (
          <button
            key={t.href}
            onClick={() => router.push(t.href)}
            className="mb-2 flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <t.icon size={16} className="text-accent" />
            </div>
            <div>
              <div className="text-[13.5px] font-medium text-text">{t.title}</div>
              <div className="mt-0.5 text-[11.5px] text-text-muted">{t.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
