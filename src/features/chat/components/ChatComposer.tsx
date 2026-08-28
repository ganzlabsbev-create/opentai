"use client";

import { ChevronDown, Clapperboard, Image as ImageIcon, ImagePlus, Loader2, Mic, MicOff, Paperclip, Plus, Radio, Send, Square, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFiles } from "@/features/files/store/FilesProvider";
import { useToast } from "@/components/ui/Toast";
import type { MesonToolKind } from "@/features/chat/hooks/useConversation";
import type { useLiveVoice } from "@/features/chat/hooks/useLiveVoice";
import type { ChatMessageImage } from "@/types/chat";

const TOOL_CHIPS: Record<MesonToolKind, { label: string; icon: typeof ImagePlus }> = {
  image: { label: "โหมดสร้างรูปภาพ", icon: ImagePlus },
  tts: { label: "โหมดแปลงข้อความเป็นเสียง", icon: Volume2 },
  video: { label: "โหมดสร้างวิดีโอ", icon: Clapperboard },
};

interface ChatComposerProps {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  onStop: () => void;
  model: string;
  onOpenModel: () => void;
  attachedIds: string[];
  onToggleAttach: (id: string) => void;
  activeTool: MesonToolKind | null;
  onSetActiveTool: (tool: MesonToolKind | null) => void;
  liveVoice: ReturnType<typeof useLiveVoice>;
  pendingImages: ChatMessageImage[];
  onAddPendingImages: (files: FileList | File[]) => void;
  onRemovePendingImage: (index: number) => void;
  imagePickError: string | null;
  onClearImagePickError: () => void;
  modelSupportsVision: boolean;
}

export function ChatComposer({
  input,
  setInput,
  onSend,
  isStreaming,
  onStop,
  model,
  onOpenModel,
  attachedIds,
  onToggleAttach,
  activeTool,
  onSetActiveTool,
  liveVoice,
  pendingImages,
  onAddPendingImages,
  onRemovePendingImage,
  imagePickError,
  onClearImagePickError,
  modelSupportsVision,
}: ChatComposerProps) {
  const { files } = useFiles();
  const toast = useToast();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  // Surface pick/send failures (e.g. "this model can't read images") as a
  // toast the moment they happen, then clear the error so it doesn't
  // re-fire on the next unrelated re-render.
  useEffect(() => {
    if (imagePickError) {
      toast(imagePickError, "danger");
      onClearImagePickError();
    }
  }, [imagePickError, toast, onClearImagePickError]);

  const attachedFiles = files.filter((f) => attachedIds.includes(f.id));

  // Dedicated "ส่งรูป" button: skips the in-app file drawer entirely and
  // opens the OS/browser's native image picker directly on tap, so a photo
  // is one tap away instead of two ("+" → "แนบไฟล์" → browse the file
  // list). If the currently selected model can't read images at all, say
  // so immediately instead of letting the person pick a photo that would
  // just get rejected at send time.
  const handleImageButtonClick = () => {
    if (!modelSupportsVision) {
      toast(`${model} ไม่รองรับการดูรูปภาพ เลือกโมเดลที่มีสัญลักษณ์ตา 👁 ก่อน`, "danger");
      return;
    }
    imageInputRef.current?.click();
  };

  // Gemini Live overlay replaces the normal composer while a call is
  // connecting/live — no navigation away from the chat screen.
  if (liveVoice.state !== "idle") {
    return (
      <div className="px-3 pt-2" style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto max-w-[680px] rounded-3xl border border-border bg-surface-sunk px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {liveVoice.state === "live" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
                  <Radio size={18} className="animate-pulse text-accent" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated">
                  <Loader2 size={16} className="animate-spin text-text-muted" />
                </div>
              )}
              <span className="text-[13px] text-text">{liveVoice.state === "live" ? "กำลังคุยเสียงสด" : "กำลังเชื่อมต่อ..."}</span>
            </div>
            <button
              onClick={liveVoice.stop}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-danger"
            >
              <MicOff size={15} className="text-bg" />
            </button>
          </div>
          {liveVoice.transcript.length > 0 && (
            <div className="mt-3 max-h-24 space-y-1 overflow-y-auto text-[12.5px] text-text-muted">
              {liveVoice.transcript.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-2" style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-[680px]">
        <button onClick={onOpenModel} className="mx-auto mb-2 flex items-center gap-1 border-0 bg-transparent">
          <span className="text-xs text-text-muted">{model}</span>
          <ChevronDown size={13} className="text-text-muted" />
        </button>

        {activeTool && (
          <div className="mb-1.5 flex items-center gap-1.5">
            <button
              onClick={() => onSetActiveTool(null)}
              className="flex items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-[11.5px] text-accent"
            >
              {(() => {
                const Icon = TOOL_CHIPS[activeTool].icon;
                return <Icon size={13} />;
              })()}
              {TOOL_CHIPS[activeTool].label}
              <X size={11} />
            </button>
          </div>
        )}

        {pendingImages.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative h-14 w-14 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt="รูปที่จะส่ง"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => onRemovePendingImage(i)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-0 bg-black/60"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {pendingImages.length > 0 && !modelSupportsVision && (
          <div className="mb-1.5 rounded-md border border-danger-soft bg-danger-soft px-2.5 py-1.5 text-[12px] text-danger">
            {model} ไม่รองรับการดูรูปภาพ — แตะชื่อโมเดลด้านบนแล้วเลือกตัวที่มีสัญลักษณ์ตา 👁 ก่อนส่ง
          </div>
        )}

        {attachedFiles.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {attachedFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => onToggleAttach(f.id)}
                className="flex items-center gap-1 rounded-full border border-border bg-surface-sunk px-2.5 py-1 text-[11.5px] text-text"
              >
                {f.name}
                <X size={11} className="text-text-muted" />
              </button>
            ))}
          </div>
        )}

        {attachOpen && (
          <div className="mb-1.5 max-h-[180px] overflow-y-auto rounded-md border border-border bg-surface p-1.5">
            {files.length === 0 ? (
              <div className="px-2 py-2 text-[12.5px] text-text-muted">ยังไม่มีไฟล์ — ไปที่หน้าไฟล์เพื่อเพิ่ม</div>
            ) : (
              files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onToggleAttach(f.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px] ${
                    attachedIds.includes(f.id) ? "bg-accent-soft text-accent" : "text-text"
                  }`}
                >
                  {f.name}
                </button>
              ))
            )}
          </div>
        )}

        {plusOpen && (
          <div className="mb-1.5 overflow-hidden rounded-md border border-border bg-surface p-1">
            <button
              onClick={() => {
                setPlusOpen(false);
                setAttachOpen((v) => !v);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-text hover:bg-surface-sunk"
            >
              <Paperclip size={15} className="text-text-muted" /> แนบไฟล์
            </button>
            <button
              onClick={() => {
                onSetActiveTool("image");
                setPlusOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-text hover:bg-surface-sunk"
            >
              <ImagePlus size={15} className="text-text-muted" /> สร้างรูปภาพ
            </button>
            <button
              onClick={() => {
                onSetActiveTool("video");
                setPlusOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-text hover:bg-surface-sunk"
            >
              <Clapperboard size={15} className="text-text-muted" /> สร้างวิดีโอ
            </button>
            <button
              onClick={() => {
                onSetActiveTool("tts");
                setPlusOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] text-text hover:bg-surface-sunk"
            >
              <Volume2 size={15} className="text-text-muted" /> แปลงข้อความเป็นเสียง
            </button>
          </div>
        )}

        <div className="flex items-end gap-1 rounded-3xl border border-border bg-surface-sunk py-1.5 pl-2.5 pr-1.5">
          <button
            onClick={() => {
              setAttachOpen(false);
              setPlusOpen((v) => !v);
            }}
            className="shrink-0 border-0 bg-transparent p-1.5"
          >
            <Plus size={18} className={plusOpen || !!activeTool || attachedFiles.length > 0 ? "text-accent" : "text-text-muted"} />
          </button>
          {/* Hidden native file input — accept="image/*" makes mobile browsers
              surface the OS photo picker/camera sheet directly on tap, no
              detour through the in-app file browser/drawer. */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) onAddPendingImages(e.target.files);
              e.target.value = "";
            }}
          />
          <button onClick={handleImageButtonClick} className="shrink-0 border-0 bg-transparent p-1.5" title="ส่งรูปภาพ">
            <ImageIcon size={18} className={pendingImages.length > 0 ? "text-accent" : "text-text-muted"} />
          </button>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={activeTool ? "พิมพ์ prompt แล้วกดส่ง" : "ส่งข้อความ"}
            rows={1}
            className="max-h-[140px] flex-1 resize-none border-0 bg-transparent px-0.5 py-1.5 font-sans text-[14.5px] leading-normal text-text outline-none"
          />
          {!isStreaming && (
            <button
              onClick={liveVoice.start}
              className="shrink-0 border-0 bg-transparent p-1.5"
              title="คุยเสียงสด"
            >
              <Mic size={18} className="text-text-muted" />
            </button>
          )}
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-0 bg-text"
            >
              <Square size={13} className="fill-bg text-bg" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim() && pendingImages.length === 0}
              className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-0 ${
                input.trim() || pendingImages.length > 0 ? "cursor-pointer bg-accent" : "cursor-not-allowed bg-surface-elevated"
              }`}
            >
              <Send size={14} className={input.trim() || pendingImages.length > 0 ? "text-accent-text" : "text-text-muted"} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
