"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Minimal shape of the global `puter` object injected by
 * https://js.puter.com/v2/ (loaded via next/script in the root layout — see
 * src/app/layout.tsx). Puter ships no official TS types, so this only
 * declares what this hook actually calls; treat any other field as unknown.
 */
interface PuterUser {
  username: string;
  [key: string]: unknown;
}

interface PuterChatChunk {
  text?: string;
}

interface PuterGlobal {
  auth: {
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    isSignedIn: () => boolean;
    getUser: () => Promise<PuterUser>;
  };
  ai: {
    chat: (
      prompt: string,
      options?: { model?: string; stream?: boolean }
    ) => Promise<{ toString: () => string } | AsyncIterable<PuterChatChunk>>;
  };
}

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

export interface PuterChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Params for the /api/meson/chat fallback path — same wire shape as the regular chat UI's Meson calls (see ai/providers/meson.ts). */
export interface MesonFallbackParams {
  mesonId: string;
  messages: PuterChatMessage[];
  context?: string;
}

/**
 * Re-streams `/api/meson/chat`'s Gemini-shaped SSE as plain text chunks.
 * Uses whatever quota is currently in effect (IP 15/day or GitHub 25/day —
 * see ai/meson/key-resolution.ts), exactly like the normal chat UI.
 */
async function* streamMesonFallback({ mesonId, messages, context }: MesonFallbackParams): AsyncGenerator<string> {
  const response = await fetch("/api/meson/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mesonId, messages, context }),
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Meson fallback failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let chunk: { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } };
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue; // ignore partial/keep-alive lines
      }
      if (chunk.error) throw new Error(chunk.error.message ?? "upstream error");
      const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) yield text;
    }
  }
}

/**
 * Client-only Puter integration (see plan doc, section 3). `puter.ai.chat()`
 * runs entirely in the browser — it never touches `/api/meson/*` and its
 * quota/billing is tied to the user's own Puter account, completely
 * separate from our IP/GitHub shared-key quota. We don't track a Puter user
 * id or add any server route for it; Puter counts its own usage.
 *
 * "Sign in with Puter" (via `signIn()` here) is a different system from
 * this app's GitHub Login (see features/auth/) — different session,
 * different button, don't conflate the two.
 */
export function usePuterChat() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // js.puter.com loads lazily (Script strategy="lazyOnload" in
    // layout.tsx), so poll briefly for window.puter rather than assuming
    // it's already there on first render.
    const check = (): boolean => {
      if (typeof window === "undefined" || !window.puter) return false;
      const puter = window.puter;
      if (!cancelled) setReady(true);
      const signedInNow = puter.auth.isSignedIn();
      if (!cancelled) setSignedIn(signedInNow);
      if (signedInNow) {
        puter.auth
          .getUser()
          .then((u) => {
            if (!cancelled) setUsername(u.username);
          })
          .catch(() => {});
      }
      return true;
    };

    if (check()) return;
    const interval = setInterval(() => {
      if (check()) clearInterval(interval);
    }, 300);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const signIn = useCallback(async () => {
    if (!window.puter) return;
    await window.puter.auth.signIn();
    setSignedIn(true);
    const u = await window.puter.auth.getUser();
    setUsername(u.username);
  }, []);

  const signOut = useCallback(async () => {
    if (!window.puter) return;
    await window.puter.auth.signOut();
    setSignedIn(false);
    setUsername(null);
  }, []);

  /**
   * Streams a chat reply. Tries `puter.ai.chat()` first when signed in —
   * on any Puter error (not signed in, Puter-side quota exhausted, model
   * unavailable, etc.) it transparently falls back to `/api/meson/chat`
   * (`fallback`), which uses whatever shared-key quota currently applies.
   */
  const chat = useCallback(
    async function* chat(prompt: string, puterModel: string, fallback: MesonFallbackParams): AsyncGenerator<string> {
      const puter = window.puter;
      if (puter && signedIn) {
        try {
          const result = await puter.ai.chat(prompt, { model: puterModel, stream: true });
          const maybeIterable = result as AsyncIterable<PuterChatChunk>;
          if (maybeIterable && typeof maybeIterable[Symbol.asyncIterator] === "function") {
            for await (const part of maybeIterable) {
              if (part.text) yield part.text;
            }
            return;
          }
          // Some Puter models/SDK versions return a plain (non-streamed) result.
          const text = String(result);
          if (text) yield text;
          return;
        } catch (err) {
          console.error("[puter] chat() failed, falling back to Meson shared-key quota:", err);
          // fall through to the Meson fallback below
        }
      }
      yield* streamMesonFallback(fallback);
    },
    [signedIn]
  );

  return { ready, signedIn, username, signIn, signOut, chat };
}
