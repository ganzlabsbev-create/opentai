"use client";

import { Download, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useMesonModels } from "@/features/meson/lib/useMesonModels";
import { MesonModelPicker } from "@/features/meson/components/MesonModelPicker";
import { mesonPostJson, readFileAsBase64 } from "@/features/meson/lib/mesonClient";
import { AppError } from "@/types/errors";

interface ImageResult {
  mimeType: string;
  base64: string;
}

interface InputImage {
  mimeType: string;
  base64: string;
  previewUrl: string;
}

export function ImageStudio() {
  const toast = useToast();
  const { settings } = useSettings();
  const { models, selected, setSelected, error } = useMesonModels("image");
  const [prompt, setPrompt] = useState("");
  const [inputImage, setInputImage] = useState<InputImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImageResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiKey = settings.apiKeys["meson"];

  const handlePickFile = async (file: File) => {
    const { mimeType, base64 } = await readFileAsBase64(file);
    setInputImage({ mimeType, base64, previewUrl: URL.createObjectURL(file) });
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selected) return;
    setLoading(true);
    setResults([]);
    try {
      const data = await mesonPostJson<{ images: ImageResult[] }>(
        "/api/meson/image",
        {
          mesonId: selected,
          prompt: prompt.trim(),
          inputImages: inputImage ? [{ mimeType: inputImage.mimeType, base64: inputImage.base64 }] : undefined,
        },
        apiKey
      );
      if (data.images.length === 0) {
        toast("โมเดลไม่ส่งรูปภาพกลับมา ลองใหม่อีกครั้ง", "danger");
      } else {
        setResults(data.images);
      }
    } catch (err) {
      toast(AppError.from(err).message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const download = (img: ImageResult, i: number) => {
    const a = document.createElement("a");
    a.href = `data:${img.mimeType};base64,${img.base64}`;
    a.download = `meson-image-${i + 1}.${img.mimeType.split("/")[1] ?? "png"}`;
    a.click();
  };

  return (
    <div>
      <MesonModelPicker models={models} selected={selected} onChange={setSelected} error={error} />

      <div className="mb-3">
        <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">
          รูปต้นฉบับ (ทางเลือก — สำหรับแก้ไขรูป)
        </label>
        {inputImage ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={inputImage.previewUrl} alt="รูปที่แนบ" className="h-24 w-24 rounded-md object-cover" />
            <button
              onClick={() => setInputImage(null)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-0 bg-text"
            >
              <X size={11} className="text-bg" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-border bg-surface-sunk"
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
        placeholder="อธิบายรูปภาพที่อยากให้สร้าง หรือวิธีแก้ไขรูปที่แนบมา"
        rows={4}
        className="mb-3 w-full resize-none rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13.5px] text-text outline-none"
      />

      <Button
        variant="accent"
        icon={loading ? undefined : Sparkles}
        disabled={loading || !prompt.trim() || !selected}
        onClick={handleGenerate}
        className="w-full"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : "สร้างรูปภาพ"}
      </Button>

      {results.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {results.map((img, i) => (
            <div key={i} className="overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`ผลลัพธ์ ${i + 1}`} className="w-full" />
              <button
                onClick={() => download(img, i)}
                className="flex w-full items-center justify-center gap-1.5 border-0 bg-surface-sunk py-1.5 text-[12px] text-text"
              >
                <Download size={12} /> ดาวน์โหลด
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
