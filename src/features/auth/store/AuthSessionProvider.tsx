"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Thin client-boundary wrapper — `next-auth/react`'s `SessionProvider` (and
 * the `useSession()` hook it powers, used by GithubAccountRow) only works
 * inside a client component, but src/app/layout.tsx is a server component
 * like the rest of the provider tree. This is GitHub Login's session state
 * only — entirely separate from Puter's own client-side sign-in, which
 * keeps its own state in usePuterChat and never touches this.
 */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
