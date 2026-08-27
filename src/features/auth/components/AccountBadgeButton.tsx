"use client";

import { User } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePuterChat } from "@/features/puter/usePuterChat";

interface AccountBadgeButtonProps {
  onClick: () => void;
}

/**
 * Floating account entry point — lives absolutely-positioned inside the
 * drawer (see Drawer.tsx) so it stays pinned in place no matter how far the
 * conversation list above it is scrolled. Tapping anywhere on the badge
 * goes to /account, regardless of sign-in state:
 *   - GitHub session with an avatar → that avatar image.
 *   - Signed in (GitHub without an avatar, or Puter-only) → first letter of
 *     whatever name/email/username is available.
 *   - Signed out everywhere → a plain person icon; /account itself shows
 *     the sign-up choices.
 */
export function AccountBadgeButton({ onClick }: AccountBadgeButtonProps) {
  const { data: session } = useSession();
  const { signedIn: puterSignedIn, username: puterUsername } = usePuterChat();

  const githubUser = session?.user;
  const displayLabel = githubUser?.name ?? githubUser?.email ?? (puterSignedIn ? puterUsername : undefined);
  const initial = displayLabel?.trim()?.[0]?.toUpperCase();

  return (
    <button
      onClick={onClick}
      title="บัญชี"
      className="absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-border bg-surface shadow-md"
    >
      {githubUser?.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- external GitHub avatar URL, not a local/static asset Next's <Image> optimizer can pre-configure a domain for.
        <img src={githubUser.image} alt="" className="h-full w-full object-cover" />
      ) : initial ? (
        <span className="text-[15px] font-semibold text-text">{initial}</span>
      ) : (
        <User size={18} className="text-text-muted" />
      )}
    </button>
  );
}
