"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { VideoStudio } from "@/features/meson/components/VideoStudio";

export default function MesonVideoPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="สร้างวิดีโอ" onBack={() => router.push("/meson")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <VideoStudio />
      </div>
    </>
  );
}
