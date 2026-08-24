"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { TtsStudio } from "@/features/meson/components/TtsStudio";

export default function MesonTtsPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="แปลงข้อความเป็นเสียง" onBack={() => router.push("/meson")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <TtsStudio />
      </div>
    </>
  );
}
