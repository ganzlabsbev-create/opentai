"use client";

import { Github } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { SettingsRow } from "@/features/settings/components/SettingsRow";

/**
 * GitHub Login for the app itself (raises the Meson shared-key quota from
 * 15/day to 25/day — see ai/meson/key-resolution.ts). This is a completely
 * separate system from Puter's "Sign in with Puter" button
 * (features/puter/PuterSignInButton.tsx) — different session, different
 * purpose, don't confuse the two.
 */
export function GithubAccountRow() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <SettingsRow label="เข้าสู่ระบบด้วย GitHub" desc="เพิ่มโควตาโมเดลกลางจาก 15 เป็น 25 ครั้ง/วัน">
        <span className="text-[12.5px] text-text-muted">กำลังโหลด…</span>
      </SettingsRow>
    );
  }

  if (session?.user) {
    const label = session.user.name ?? session.user.email ?? "GitHub";
    return (
      <SettingsRow label="เข้าสู่ระบบแล้ว" desc={`${label} · โควตาโมเดลกลาง 25 ครั้ง/วัน`}>
        <Button size="sm" variant="outline" onClick={() => signOut()}>
          ออกจากระบบ
        </Button>
      </SettingsRow>
    );
  }

  return (
    <SettingsRow label="เข้าสู่ระบบด้วย GitHub" desc="เพิ่มโควตาโมเดลกลางจาก 15 เป็น 25 ครั้ง/วัน">
      <Button size="sm" variant="outline" icon={Github} onClick={() => signIn("github")}>
        เข้าสู่ระบบ
      </Button>
    </SettingsRow>
  );
}
