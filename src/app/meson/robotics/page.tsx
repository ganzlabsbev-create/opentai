"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { RoboticsStudio } from "@/features/meson/components/RoboticsStudio";

export default function MesonRoboticsPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="หุ่นยนต์ / Physical AI" onBack={() => router.push("/meson")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <RoboticsStudio />
      </div>
    </>
  );
}
