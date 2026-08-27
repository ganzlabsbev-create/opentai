"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { routeGenerate } from "@/ai/router";
import type { AIChatMessage } from "@/ai/providers/types";
import { AppError } from "@/types/errors";
import type { AppSettings } from "@/types/settings";

interface UseStreamingArgs {
  /** Cumulative text so far + whether the stream has finished. */
  onChunk: (cumulativeText: string, done: boolean) => void;
  onProviderSelected?: (providerId: string, modelId: string) => void;
  onError?: (err: AppError) => void;
}

interface StartArgs {
  messages: AIChatMessage[];
  context?: string;
  settings: AppSettings;
}

/** How often the typewriter reveals more characters. */
const TYPE_TICK_MS = 18;
/** Baseline characters revealed per tick when the network is roughly keeping pace. */
const TYPE_MIN_CHARS = 2;
/**
 * If the network delivers a big chunk (or finishes) while we're still
 * catching up, reveal faster proportional to the backlog so a long reply
 * doesn't leave the typewriter trailing behind for ages — this keeps the
 * "typing" feel for normal-sized deltas while never actually lagging the
 * real content by more than ~a second or so.
 */
const TYPE_BACKLOG_DIVISOR = 24;

/**
 * Real streaming via `ai/router` (Web Streams under the hood, inside each
 * provider's `generateStream`). On top of the raw network deltas (which can
 * arrive in arbitrarily large chunks depending on the upstream provider),
 * this adds a typewriter-style reveal so the reply always appears to type
 * itself out character by character, like other chat apps, instead of
 * jumping in whatever chunk sizes happened to come over the wire. `onChunk`'s
 * contract (cumulative text, done flag) is unchanged so ChatScreen didn't
 * need to change.
 */
export function useStreaming({ onChunk, onProviderSelected, onError }: UseStreamingArgs) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Typewriter state: `target` is the latest text we actually have (from the
  // network), `shown` is how much of it has been revealed to onChunk so far.
  // `networkDone` flags that the network side finished (or errored/aborted)
  // — the visible stream isn't "done" until the reveal also catches up.
  const targetRef = useRef("");
  const shownRef = useRef(0);
  const networkDoneRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Starts the reveal timer if it isn't already running. Idempotent — safe to call on every network delta. */
  const ensureTyping = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      const target = targetRef.current;
      const backlog = target.length - shownRef.current;
      if (backlog <= 0) {
        if (networkDoneRef.current) {
          stopTimer();
          setIsStreaming(false);
          onChunk(target, true);
        }
        return;
      }
      const step = Math.max(TYPE_MIN_CHARS, Math.ceil(backlog / TYPE_BACKLOG_DIVISOR));
      shownRef.current = Math.min(target.length, shownRef.current + step);
      const caughtUp = shownRef.current >= target.length;
      const finished = caughtUp && networkDoneRef.current;
      onChunk(target.slice(0, shownRef.current), finished);
      if (finished) {
        stopTimer();
        setIsStreaming(false);
      }
    }, TYPE_TICK_MS);
  }, [onChunk, stopTimer]);

  /** Skips straight to the end — used on abort/error so stopping never leaves the UI waiting on an animation. */
  const flushToEnd = useCallback(
    (done: boolean) => {
      stopTimer();
      shownRef.current = targetRef.current.length;
      onChunk(targetRef.current, done);
    },
    [onChunk, stopTimer]
  );

  const start = useCallback(
    async ({ messages, context, settings }: StartArgs) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      targetRef.current = "";
      shownRef.current = 0;
      networkDoneRef.current = false;
      stopTimer();

      try {
        const gen = routeGenerate({
          messages,
          context,
          settings,
          signal: controller.signal,
          onProviderSelected,
        });

        let result: IteratorResult<string, { providerId: string; modelId: string }>;
        while (!(result = await gen.next()).done) {
          targetRef.current = result.value;
          ensureTyping();
        }
        networkDoneRef.current = true;
        ensureTyping();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          flushToEnd(true);
          setIsStreaming(false);
        } else {
          const appErr = AppError.from(err);
          stopTimer();
          setIsStreaming(false);
          onError?.(appErr);
        }
      } finally {
        abortRef.current = null;
      }
    },
    [ensureTyping, flushToEnd, onError, onProviderSelected, stopTimer]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => stopTimer, [stopTimer]);

  return { isStreaming, start, stop };
}
