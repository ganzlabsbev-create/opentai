"use client";

import { Copy, Download, Loader2, RotateCcw } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { MarkdownMessage } from "@/components/shared/MarkdownMessage";
import { useToast } from "@/components/ui/Toast";
import { AppError, type AppErrorCode } from "@/types/errors";
import type { ChatMessage } from "@/types/chat";

interface MessageRowProps {
  msg: ChatMessage;
  onRegenerate: (msg: ChatMessage) => void;
}

/** Best-effort filename extension for a data: URL / remote media URL, for the download link. */
function extFromMediaUrl(url: string, fallback: string): string {
  const m = url.match(/^data:[^/]+\/([^;]+);/);
  if (m?.[1]) return m[1];
  const u = url.split("?")[0] ?? url;
  const dot = u.lastIndexOf(".");
  return dot === -1 ? fallback : u.slice(dot + 1);
}

function MediaBody({ msg }: { msg: ChatMessage }) {
  const kind = msg.kind ?? "text";

  // image/audio: still waiting on the /api/meson/{image,tts} response.
  if ((kind === "image" || kind === "audio") && msg.streaming && !msg.mediaUrl && !msg.errorCode) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13px] text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        {kind === "image" ? "กำลังสร้างรูปภาพ..." : "กำลังแปลงเป็นเสียง..."}
      </div>
    );
  }

  if ((kind === "image" || kind === "audio") && msg.errorCode) {
    return (
      <div className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
        {new AppError(msg.errorCode as AppErrorCode).userMessage}
      </div>
    );
  }

  if (kind === "image" && msg.mediaUrl) {
    return (
      <div className="overflow-hidden rounded-md border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={msg.mediaUrl} alt={msg.content || "รูปที่สร้าง"} className="w-full" />
        <a
          href={msg.mediaUrl}
          download={`opentai-image.${extFromMediaUrl(msg.mediaUrl, "png")}`}
          className="flex w-full items-center justify-center gap-1.5 border-0 bg-surface-sunk py-1.5 text-[12px] text-text"
        >
          <Download size={12} /> ดาวน์โหลด
        </a>
      </div>
    );
  }

  if (kind === "audio" && msg.mediaUrl) {
    return (
      <div className="rounded-md border border-border bg-surface p-3">
        <audio controls src={msg.mediaUrl} className="w-full" />
        <a
          href={msg.mediaUrl}
          download={`opentai-audio.${extFromMediaUrl(msg.mediaUrl, "wav")}`}
          className="mt-2 flex items-center gap-1.5 border-0 bg-transparent text-[12.5px] text-accent"
        >
          <Download size={13} /> ดาวน์โหลด
        </a>
      </div>
    );
  }

  if (kind === "video") {
    if (msg.mediaStatus === "generating") {
      return (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-[13px] text-text-muted">
          <Loader2 size={14} className="animate-spin" />
          กำลังสร้างวิดีโอ… อาจใช้เวลาหลายนาที
        </div>
      );
    }
    if (msg.mediaStatus === "failed") {
      return (
        <div className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          {msg.errorCode ? new AppError(msg.errorCode as AppErrorCode).userMessage : "สร้างวิดีโอไม่สำเร็จ"}
        </div>
      );
    }
    if (msg.mediaUrl) {
      return (
        <div className="rounded-md border border-border bg-surface p-3">
          <video controls src={msg.mediaUrl} className="w-full rounded-md" />
        </div>
      );
    }
  }

  return null;
}

export function MessageRow({ msg, onRegenerate }: MessageRowProps) {
  const toast = useToast();
  const isUser = msg.role === "user";
  const kind = msg.kind ?? "text";

  if (isUser) {
    return (
      <div className="flex justify-end py-1.5">
        <div className="max-w-[82%] rounded-2xl bg-surface-sunk px-3.5 py-2.5 text-[14.5px] leading-[1.55] text-text">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      {kind !== "text" ? (
        <MediaBody msg={msg} />
      ) : msg.streaming && !msg.content ? (
        <div className="flex items-center gap-2 py-1">
          <Loader2 size={14} className="animate-spin text-text-muted" />
          <span className="text-[13px] text-text-muted">กำลังคิด...</span>
        </div>
      ) : msg.errorCode ? (
        <div className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
          {new AppError(msg.errorCode as AppErrorCode).userMessage}
        </div>
      ) : (
        <>
          <MarkdownMessage text={msg.content} />
          {msg.providerId && (
            <div className="mt-0.5 text-[10.5px] text-text-muted">
              {msg.providerId}
              {msg.modelId ? ` · ${msg.modelId}` : ""}
            </div>
          )}
        </>
      )}
      {!msg.streaming && (
        <div className="-ml-2 mt-0.5 flex gap-0.5">
          <IconButton
            icon={Copy}
            size={14}
            title="คัดลอก"
            onClick={() => {
              navigator.clipboard?.writeText(msg.content);
              toast("คัดลอกแล้ว");
            }}
          />
          <IconButton icon={RotateCcw} size={14} title="ลองใหม่" onClick={() => onRegenerate(msg)} />
        </div>
      )}
    </div>
  );
}
