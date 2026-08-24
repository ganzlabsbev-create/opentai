"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { LiveVoiceStudio } from "@/features/meson/components/LiveVoiceStudio";

export default function MesonLivePage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="เสียงสด" onBack={() => router.push("/meson")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <LiveVoiceStudio />
      </div>
    </>
  );
}
