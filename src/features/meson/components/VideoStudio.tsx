"use client";

import { Clapperboard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useMesonModels } from "@/features/meson/lib/useMesonModels";
import { MesonModelPicker } from "@/features/meson/components/MesonModelPicker";
import { mesonPostJson } from "@/features/meson/lib/mesonClient";
import { useVideoJobPolling, type ExtractedVideoMedia } from "@/features/meson/hooks/useVideoJobPolling";
import { AppError } from "@/types/errors";

interface JobState {
  jobId: string;
  status: "pending" | "done" | "failed";
  media?: ExtractedVideoMedia;
  rawResult?: unknown;
  error?: string;
}

export function VideoStudio() {
  const toast = useToast();
  const { settings } = useSettings();
  const { models, selected, setSelected, error } = useMesonModels("video");
  const [prompt, setPrompt] = useState("");
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const { pollJob, stopAll } = useVideoJobPolling();

  const apiKey = settings.apiKeys["meson"];

  useEffect(() => stopAll, [stopAll]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !selected) return;
    setStarting(true);
    setJob(null);
    try {
      const data = await mesonPostJson<{ jobId: string; status: "pending" }>("/api/meson/video", { mesonId: selected, prompt: prompt.trim() }, apiKey);
      setJob({ jobId: data.jobId, status: "pending" });
      pollJob(data.jobId, {
        onDone: (media, rawResult) => setJob({ jobId: data.jobId, status: "done", media, rawResult }),
        onFailed: (message) => setJob({ jobId: data.jobId, status: "failed", error: message }),
        onError: (err) => {
          setJob(null);
          toast(err.message, "danger");
        },
      });
    } catch (err) {
      toast(AppError.from(err).message, "danger");
    } finally {
      setStarting(false);
    }
  };

  const video = job?.status === "done" ? job.media ?? {} : {};

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
              {JSON.stringify(job.rawResult, null, 2)}
            </pre>
          )}
        </div>
      )}

      {job?.status === "failed" && <p className="mt-3 text-[13px] text-danger">{job.error ?? "สร้างวิดีโอไม่สำเร็จ"}</p>}
    </div>
  );
}
