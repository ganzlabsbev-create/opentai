"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { QuotaView } from "@/features/quota/components/QuotaView";

export default function QuotaPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="โควตา" onBack={() => router.push("/")} />
      <div className="flex-1 overflow-y-auto px-4 py-1.5">
        <QuotaView />
      </div>
    </>
  );
}
