"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { mesonPostJson } from "@/features/meson/lib/mesonClient";
import { GeminiLiveClient, LiveAudioPlayer } from "@/features/meson/lib/geminiLiveClient";
import { AppError } from "@/types/errors";

export type LiveVoiceState = "idle" | "connecting" | "live";

/**
 * Shared Gemini Live session logic, originally inlined in
 * LiveVoiceStudio.tsx. Pulled out into a hook so both the standalone
 * /meson/live page and the ChatComposer mic overlay can drive the same
 * session lifecycle without duplicating the connect/mic/cleanup code.
 *
 * IMPORTANT: unlike the original LiveVoiceStudio (which had no cleanup on
 * unmount), this hook always tears down the mic stream + websocket when the
 * owning component unmounts — required for the composer overlay, since a
 * person can navigate away from the chat screen mid-call.
 */
export function useLiveVoice(mesonId: string, onError?: (message: string) => void) {
  const { settings } = useSettings();
  const [state, setState] = useState<LiveVoiceState>("idle");
  const [transcript, setTranscript] = useState<string[]>([]);
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);

  const apiKey = settings.apiKeys["meson"];

  const stop = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!mesonId) return;
    setState("connecting");
    setTranscript([]);
    try {
      const { token, model } = await mesonPostJson<{ token: string; model: string }>(
        "/api/meson/live-token",
        { mesonId },
        apiKey
      );
      if (!token) throw new AppError("PROVIDER_UNAVAILABLE", "Gemini ไม่ส่ง token กลับมา");

      const player = new LiveAudioPlayer();
      playerRef.current = player;

      const client = new GeminiLiveClient({
        onOpen: () => setState("live"),
        onModelTurnAudio: (pcm) => player.push(pcm),
        onModelTurnText: (text) => setTranscript((t) => [...t, text]),
        onError: (msg) => {
          onError?.(msg);
          stop();
        },
        onClose: () => setState((s) => (s === "idle" ? s : "idle")),
      });
      clientRef.current = client;
      client.connect(token, model);
      await client.startMic();
    } catch (err) {
      onError?.(AppError.from(err).message);
      setState("idle");
    }
  }, [mesonId, apiKey, onError, stop]);

  // Cleanup on unmount: close mic stream + websocket. LiveVoiceStudio's
  // original inline implementation didn't have this — flagged explicitly
  // in the redesign plan as something not to forget for the composer.
  useEffect(() => {
    return () => {
      clientRef.current?.close();
      clientRef.current = null;
      playerRef.current?.close();
      playerRef.current = null;
    };
  }, []);

  return { state, transcript, start, stop };
}
