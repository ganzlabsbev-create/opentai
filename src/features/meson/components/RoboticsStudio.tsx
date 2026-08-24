"use client";

import { Bot, ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useMesonModels } from "@/features/meson/lib/useMesonModels";
import { MesonModelPicker } from "@/features/meson/components/MesonModelPicker";
import { mesonPostJson, readFileAsBase64 } from "@/features/meson/lib/mesonClient";
import { AppError } from "@/types/errors";

interface InputImage {
  mimeType: string;
  base64: string;
  previewUrl: string;
}

/** Best-effort pretty-print: if the model's text response is JSON, format it; otherwise show as-is. */
function prettyPrint(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function RoboticsStudio() {
  const toast = useToast();
  const { settings } = useSettings();
  const { models, selected, setSelected, error } = useMesonModels("robotics");
  const [image, setImage] = useState<InputImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiKey = settings.apiKeys["meson"];

  const handlePickFile = async (file: File) => {
    const { mimeType, base64 } = await readFileAsBase64(file);
    setImage({ mimeType, base64, previewUrl: URL.createObjectURL(file) });
  };

  const handleRun = async () => {
    if (!prompt.trim() || !image || !selected) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await mesonPostJson<{ result: string }>(
        "/api/meson/robotics",
        { mesonId: selected, prompt: prompt.trim(), image: { mimeType: image.mimeType, base64: image.base64 } },
        apiKey
      );
      setResult(data.result);
    } catch (err) {
      toast(AppError.from(err).message, "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <MesonModelPicker models={models} selected={selected} onChange={setSelected} error={error} />

      <div className="mb-3">
        <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">รูปฉาก (จำเป็น)</label>
        {image ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.previewUrl} alt="รูปที่แนบ" className="h-28 w-28 rounded-md object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-0 bg-text"
            >
              <X size={11} className="text-bg" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-28 w-28 items-center justify-center rounded-md border border-dashed border-border bg-surface-sunk"
          >
            <ImagePlus size={18} className="text-text-muted" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) handlePickFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="สั่งงาน เช่น 'ชี้ตำแหน่งแก้วบนโต๊ะ' หรือ 'บอกเส้นทางไปยังประตู'"
        rows={3}
        className="mb-3 w-full resize-none rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13.5px] text-text outline-none"
      />

      <Button
        variant="accent"
        icon={loading ? undefined : Bot}
        disabled={loading || !prompt.trim() || !image || !selected}
        onClick={handleRun}
        className="w-full"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : "วิเคราะห์"}
      </Button>

      {result && (
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-surface-sunk p-3 font-mono text-[12px] text-text">
          {prettyPrint(result)}
        </pre>
      )}
    </div>
  );
}
