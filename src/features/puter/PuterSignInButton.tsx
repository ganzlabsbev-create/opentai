"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePuterChat } from "./usePuterChat";

/**
 * "Sign in with Puter" — a completely separate system from this app's own
 * GitHub Login (features/auth/). Puter's quota/billing belongs to the
 * user's own Puter account and never touches our IP/GitHub shared-key
 * quota (see usePuterChat.ts). Safe to render anywhere; does nothing until
 * https://js.puter.com/v2/ has finished loading (see layout.tsx).
 */
export function PuterSignInButton({ className }: { className?: string }) {
  const { ready, signedIn, username, signIn, signOut } = usePuterChat();

  if (!ready) return null;

  if (signedIn) {
    return (
      <Button size="sm" variant="outline" icon={Sparkles} onClick={() => void signOut()} className={className}>
        Puter: {username ?? "signed in"}
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" icon={Sparkles} onClick={() => void signIn()} className={className}>
      Sign in with Puter
    </Button>
  );
}
