"use client";

import { Github } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { SettingsRow, SettingsSectionLabel } from "@/features/settings/components/SettingsRow";
import { GithubAccountRow } from "@/features/auth/components/GithubAccountRow";
import { PuterSignInButton } from "@/features/puter/PuterSignInButton";
import { usePuterChat } from "@/features/puter/usePuterChat";

export function AccountPageContent() {
  const { data: session, status } = useSession();
  const { signedIn: puterSignedIn } = usePuterChat();

  const signedInAnywhere = Boolean(session?.user) || puterSignedIn;

  if (status !== "loading" && !signedInAnywhere) {
    return (
      <div className="flex flex-col items-center px-6 pb-8 pt-12 text-center">
        <img src="/brand/ot-mark.svg" alt="" className="h-20 w-20 dark:hidden" />
        <img src="/brand/ot-mark-white.svg" alt="" className="hidden h-20 w-20 dark:block" />
        <img src="/brand/opentai-wordmark.svg" alt="OpenTai" className="mt-3 h-11 w-auto dark:hidden" />
        <img src="/brand/opentai-wordmark-white.svg" alt="OpenTai" className="mt-3 hidden h-11 w-auto dark:block" />
        <div className="mt-1 text-[13px] text-text-muted">ยังไม่ได้เข้าสู่ระบบ — เลือกวิธีสมัครบัญชี</div>

        <div className="mt-7 flex w-full max-w-[280px] flex-col gap-2.5">
          <Button icon={Github} onClick={() => signIn("github")} className="w-full justify-center">
            สมัครด้วย GitHub
          </Button>
          <PuterSignInButton className="w-full justify-center" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SettingsSectionLabel>บัญชี</SettingsSectionLabel>
      <GithubAccountRow />
      <SettingsRow label="Puter (ทดลอง)" desc="บัญชีแยกต่างหาก ไม่เกี่ยวกับโควตา IP/GitHub ด้านบน — puter.com">
        <PuterSignInButton />
      </SettingsRow>
    </div>
  );
}
