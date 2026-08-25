"use client";

import { useCallback, useRef } from "react";
import { mesonGetJson } from "@/features/meson/lib/mesonClient";
import { AppError } from "@/types/errors";

const POLL_INTERVAL_MS = 5000;

export interface VideoJobStatus {
  jobId: string;
  status: "pending" | "done" | "failed";
  result?: unknown;
  error?: string;
}

export interface ExtractedVideoMedia {
  uri?: string;
  base64?: { mimeType: string; data: string };
}

/**
 * The exact shape of `result` (Google's long-running-operation `response`
 * field for gemini-omni-flash) is unconfirmed against current docs — see
 * the NOTE in /api/meson/video/route.ts. This does a best-effort search for
 * a playable video URI or inline base64 bytes anywhere in the object, and
 * falls back to a raw JSON dump so nothing is silently lost if the shape
 * turns out different once that route is verified against a real response.
 */
export function extractVideoMedia(result: unknown): ExtractedVideoMedia {
  if (!result || typeof result !== "object") return {};
  const json = JSON.stringify(result);
  const uriMatch = json.match(/"(https?:\/\/[^"]+\.(mp4|webm)[^"]*)"/i);
  const dataMatch = json.match(/"mimeType"\s*:\s*"(video\/[^"]+)"[^}]*"data"\s*:\s*"([A-Za-z0-9+/=]+)"/);
  return {
    uri: uriMatch?.[1],
    base64: dataMatch ? { mimeType: dataMatch[1]!, data: dataMatch[2]! } : undefined,
  };
}

interface VideoJobCallbacks {
  onDone: (media: ExtractedVideoMedia, rawResult: unknown) => void;
  onFailed: (message: string) => void;
  onError: (err: AppError) => void;
}

/**
 * Shared polling logic for /api/meson/video/[jobId], used by both the
 * standalone VideoStudio page and the in-composer chat flow. Supports
 * polling more than one job at once (keyed by jobId) since the composer
 * lets a person kick off a video generation, keep chatting, and see the
 * bubble update whenever it lands.
 */
export function useVideoJobPolling() {
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const stopPolling = useCallback((jobId: string) => {
    const timer = timersRef.current.get(jobId);
    if (timer) {
      clearInterval(timer);
      timersRef.current.delete(jobId);
    }
  }, []);

  const stopAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearInterval(timer));
    timersRef.current.clear();
  }, []);

  const pollJob = useCallback(
    (jobId: string, cb: VideoJobCallbacks) => {
      stopPolling(jobId);
      const poll = async () => {
        try {
          const data = await mesonGetJson<VideoJobStatus>(`/api/meson/video/${jobId}`);
          if (data.status === "done") {
            stopPolling(jobId);
            cb.onDone(extractVideoMedia(data.result), data.result);
          } else if (data.status === "failed") {
            stopPolling(jobId);
            cb.onFailed(data.error ?? "สร้างวิดีโอไม่สำเร็จ");
          }
        } catch (err) {
          stopPolling(jobId);
          cb.onError(AppError.from(err));
        }
      };
      const timer = setInterval(poll, POLL_INTERVAL_MS);
      timersRef.current.set(jobId, timer);
    },
    [stopPolling]
  );

  return { pollJob, stopPolling, stopAll };
}
