"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { SettingsSections } from "@/features/settings/components/SettingsSections";

export default function SettingsPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="ตั้งค่า" onBack={() => router.push("/")} />
      <div className="flex-1 overflow-y-auto px-4 py-1.5">
        <SettingsSections />
      </div>
    </>
  );
}
