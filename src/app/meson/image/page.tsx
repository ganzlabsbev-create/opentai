"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ImageStudio } from "@/features/meson/components/ImageStudio";

export default function MesonImagePage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="สร้าง/แก้ไขรูปภาพ" onBack={() => router.push("/meson")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <ImageStudio />
      </div>
    </>
  );
}
