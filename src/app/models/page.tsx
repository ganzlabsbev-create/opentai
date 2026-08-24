"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ProviderList } from "@/features/models/components/ProviderList";
import { ModelSelector } from "@/features/models/components/ModelSelector";

export default function ModelsPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="โมเดล" onBack={() => router.push("/")} />
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <ProviderList />
        <ModelSelector />
      </div>
    </>
  );
}
