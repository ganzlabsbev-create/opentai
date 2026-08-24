"use client";

import { useCallback, useRef, useState } from "react";
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

/**
 * Real streaming via `ai/router` (Web Streams under the hood, inside each
 * provider's `generateStream`) — replaces the Phase 1 prototype's
 * `setInterval` loop over a hardcoded string. `onChunk`'s contract
 * (cumulative text, done flag) is unchanged so ChatScreen didn't need to
 * change.
 */
export function useStreaming({ onChunk, onProviderSelected, onError }: UseStreamingArgs) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async ({ messages, context, settings }: StartArgs) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      let lastText = "";
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
          lastText = result.value;
          onChunk(lastText, false);
        }
        onChunk(lastText, true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          onChunk(lastText, true);
        } else {
          const appErr = AppError.from(err);
          onError?.(appErr);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [onChunk, onError, onProviderSelected]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { isStreaming, start, stop };
}
