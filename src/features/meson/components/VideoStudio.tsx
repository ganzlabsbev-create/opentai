"use client";

import { Clapperboard, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useMesonModels } from "@/features/meson/lib/useMesonModels";
import { MesonModelPicker } from "@/features/meson/components/MesonModelPicker";
import { mesonGetJson, mesonPostJson } from "@/features/meson/lib/mesonClient";
import { AppError } from "@/types/errors";

const POLL_INTERVAL_MS = 5000;

interface JobStatus {
  jobId: string;
  status: "pending" | "done" | "failed";
  result?: unknown;
  error?: string;
}

/**
 * The exact shape of `result` (Google's long-running-operation `response`
 * field for gemini-omni-flash) is unconfirmed against current docs — see
 * the NOTE in /api/meson/video/route.ts. This does a best-effort search for
 * a playable video URI or inline base64 bytes anywhere in the object, and
 * falls back to a raw JSON dump so nothing is silently lost if the shape
 * turns out different once that route is verified against a real response.
 */
function extractVideo(result: unknown): { uri?: string; base64?: { mimeType: string; data: string } } {
  if (!result || typeof result !== "object") return {};
  const json = JSON.stringify(result);
  const uriMatch = json.match(/"(https?:\/\/[^"]+\.(mp4|webm)[^"]*)"/i);
  const dataMatch = json.match(/"mimeType"\s*:\s*"(video\/[^"]+)"[^}]*"data"\s*:\s*"([A-Za-z0-9+/=]+)"/);
  return {
    uri: uriMatch?.[1],
    base64: dataMatch ? { mimeType: dataMatch[1], data: dataMatch[2] } : undefined,
  };
}

export function VideoStudio() {
  const toast = useToast();
  const { settings } = useSettings();
  const { models, selected, setSelected, error } = useMesonModels("video");
  const [prompt, setPrompt] = useState("");
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<JobStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const apiKey = settings.apiKeys["meson"];

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  const pollOnce = async (jobId: string) => {
    try {
      const data = await mesonGetJson<JobStatus>(`/api/meson/video/${jobId}`);
      setJob(data);
      if (data.status !== "pending") {
        stopPolling();
        if (data.status === "failed") toast(data.error ?? "สร้างวิดีโอไม่สำเร็จ", "danger");
      }
    } catch (err) {
      stopPolling();
      toast(AppError.from(err).message, "danger");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selected) return;
    setStarting(true);
    setJob(null);
    stopPolling();
    try {
      const data = await mesonPostJson<{ jobId: string; status: "pending" }>("/api/meson/video", { mesonId: selected, prompt: prompt.trim() }, apiKey);
      setJob({ jobId: data.jobId, status: "pending" });
      pollRef.current = setInterval(() => pollOnce(data.jobId), POLL_INTERVAL_MS);
    } catch (err) {
      toast(AppError.from(err).message, "danger");
    } finally {
      setStarting(false);
    }
  };

  const video = job?.status === "done" ? extractVideo(job.result) : {};

  return (
    <div>
      <MesonModelPicker models={models} selected={selected} onChange={setSelected} error={error} />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="อธิบายวิดีโอที่อยากให้สร้าง"
        rows={4}
        className="mb-3 w-full resize-none rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13.5px] text-text outline-none"
      />

      <Button
        variant="accent"
        icon={starting || job?.status === "pending" ? undefined : Clapperboard}
        disabled={starting || job?.status === "pending" || !prompt.trim() || !selected}
        onClick={handleGenerate}
        className="w-full"
      >
        {starting ? <Loader2 size={15} className="animate-spin" /> : "สร้างวิดีโอ"}
      </Button>

      {job?.status === "pending" && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13px] text-text-muted">
          <Loader2 size={14} className="animate-spin" />
          กำลังสร้างวิดีโอ… อาจใช้เวลาหลายนาที
        </div>
      )}

      {job?.status === "done" && (
        <div className="mt-4 rounded-md border border-border bg-surface p-3">
          {video.base64 ? (
            <video controls src={`data:${video.base64.mimeType};base64,${video.base64.data}`} className="w-full rounded-md" />
          ) : video.uri ? (
            <a href={video.uri} target="_blank" rel="noreferrer" className="text-[13px] text-accent underline">
              เปิดวิดีโอผลลัพธ์
            </a>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] text-text-muted">
              {JSON.stringify(job.result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {job?.status === "failed" && <p className="mt-3 text-[13px] text-danger">{job.error ?? "สร้างวิดีโอไม่สำเร็จ"}</p>}
    </div>
  );
}
