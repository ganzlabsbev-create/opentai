"use client";

import { Download, Loader2, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useMesonModels } from "@/features/meson/lib/useMesonModels";
import { MesonModelPicker } from "@/features/meson/components/MesonModelPicker";
import { mesonPostJson } from "@/features/meson/lib/mesonClient";
import { saveAssistantFile, base64ToArrayBuffer, extFromMimeType } from "@/features/chat/lib/saveAssistantFile";
import { useFiles } from "@/features/files/store/FilesProvider";
import { AppError } from "@/types/errors";

// Gemini's documented prebuilt voice names as of the last confirmed docs —
// double-check against Google's current TTS voice list before relying on
// this being exhaustive/up to date (preview surface, changes without notice).
const VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr", "Aoede"];

interface TtsResult {
  mimeType: string;
  base64: string;
}

export function TtsStudio() {
  const toast = useToast();
  const { settings } = useSettings();
  const { registerFile } = useFiles();
  const { models, selected, setSelected, error } = useMesonModels("tts");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TtsResult | null>(null);

  const apiKey = settings.apiKeys["meson"];

  const handleGenerate = async () => {
    if (!text.trim() || !selected) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await mesonPostJson<TtsResult>(
        "/api/meson/tts",
        { mesonId: selected, text: text.trim(), voiceName: voice || undefined },
        apiKey
      );
      setResult(data);
      try {
        const { entry } = await saveAssistantFile(base64ToArrayBuffer(data.base64), {
          name: `meson-tts-${Date.now()}.${extFromMimeType(data.mimeType, "wav")}`,
          mimeType: data.mimeType,
          mediaType: "audio",
        });
        registerFile(entry);
      } catch {
        // Non-fatal — playback/download below still works even if saving to /library fails.
      }
    } catch (err) {
      toast(AppError.from(err).message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = `data:${result.mimeType};base64,${result.base64}`;
    a.download = `meson-tts.${result.mimeType.includes("wav") ? "wav" : "audio"}`;
    a.click();
  };

  return (
    <div>
      <MesonModelPicker models={models} selected={selected} onChange={setSelected} error={error} />

      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">เสียง (ทางเลือก)</label>
      <select
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        className="mb-3 w-full rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13.5px] text-text outline-none"
      >
        <option value="">ค่าเริ่มต้นของโมเดล</option>
        {VOICES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="พิมพ์ข้อความที่ต้องการแปลงเป็นเสียง"
        rows={5}
        className="mb-3 w-full resize-none rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13.5px] text-text outline-none"
      />

      <Button
        variant="accent"
        icon={loading ? undefined : Volume2}
        disabled={loading || !text.trim() || !selected}
        onClick={handleGenerate}
        className="w-full"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : "แปลงเป็นเสียง"}
      </Button>

      {result && (
        <div className="mt-4 rounded-md border border-border bg-surface p-3">
          <audio controls src={`data:${result.mimeType};base64,${result.base64}`} className="w-full" />
          <button onClick={download} className="mt-2 flex items-center gap-1.5 border-0 bg-transparent text-[12.5px] text-accent">
            <Download size={13} /> ดาวน์โหลด
          </button>
        </div>
      )}
    </div>
  );
}
