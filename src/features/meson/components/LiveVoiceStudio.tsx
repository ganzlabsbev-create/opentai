"use client";

import { Loader2, Mic, MicOff, Radio } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useMesonModels } from "@/features/meson/lib/useMesonModels";
import { MesonModelPicker } from "@/features/meson/components/MesonModelPicker";
import { mesonPostJson } from "@/features/meson/lib/mesonClient";
import { GeminiLiveClient, LiveAudioPlayer } from "@/features/meson/lib/geminiLiveClient";
import { AppError } from "@/types/errors";

type SessionState = "idle" | "connecting" | "live";

export function LiveVoiceStudio() {
  const toast = useToast();
  const { settings } = useSettings();
  const { models, selected, setSelected, error } = useMesonModels("live");
  const [state, setState] = useState<SessionState>("idle");
  const [transcript, setTranscript] = useState<string[]>([]);
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);

  const apiKey = settings.apiKeys["meson"];

  const stop = () => {
    clientRef.current?.close();
    clientRef.current = null;
    playerRef.current?.close();
    playerRef.current = null;
    setState("idle");
  };

  const start = async () => {
    if (!selected) return;
    setState("connecting");
    setTranscript([]);
    try {
      const { token, model } = await mesonPostJson<{ token: string; model: string }>(
        "/api/meson/live-token",
        { mesonId: selected },
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
          toast(msg, "danger");
          stop();
        },
        onClose: () => setState((s) => (s === "idle" ? s : "idle")),
      });
      clientRef.current = client;
      client.connect(token, model);
      await client.startMic();
    } catch (err) {
      toast(AppError.from(err).message, "danger");
      setState("idle");
    }
  };

  return (
    <div>
      <MesonModelPicker models={models} selected={selected} onChange={setSelected} error={error} />

      <p className="mb-4 text-[12.5px] text-text-muted">
        เชื่อมต่อไมโครโฟนของคุณเข้ากับ Gemini Live โดยตรง (ไม่ผ่าน server ของเรา) เสียงจะถูกส่งและรับแบบเรียลไทม์
      </p>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-sunk py-8">
        {state === "live" ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
            <Radio size={24} className="animate-pulse text-accent" />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-elevated">
            {state === "connecting" ? (
              <Loader2 size={22} className="animate-spin text-text-muted" />
            ) : (
              <MicOff size={22} className="text-text-muted" />
            )}
          </div>
        )}

        {state === "live" ? (
          <Button variant="danger" icon={MicOff} onClick={stop}>
            วางสาย
          </Button>
        ) : (
          <Button variant="accent" icon={state === "connecting" ? undefined : Mic} disabled={state === "connecting" || !selected} onClick={start}>
            {state === "connecting" ? <Loader2 size={15} className="animate-spin" /> : "เริ่มสนทนา"}
          </Button>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="mt-4 space-y-1.5 rounded-md border border-border bg-surface p-3">
          {transcript.map((line, i) => (
            <p key={i} className="text-[13px] text-text">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
