"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { AccountPageContent } from "@/features/auth/components/AccountPageContent";

export default function AccountPage() {
  const router = useRouter();
  return (
    <>
      <TopBar title="บัญชี" onBack={() => router.push("/")} />
      <div className="flex-1 overflow-y-auto px-4 py-1.5">
        <AccountPageContent />
      </div>
    </>
  );
}
