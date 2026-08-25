"use client";

import { Copy, Download, FileDown, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { MarkdownMessage } from "@/components/shared/MarkdownMessage";
import { AttachmentList } from "@/components/shared/AttachmentCard";
import { useToast } from "@/components/ui/Toast";
import { useConversations } from "@/features/chat/store/ConversationsProvider";
import { useFiles } from "@/features/files/store/FilesProvider";
import { saveAssistantFile } from "@/features/chat/lib/saveAssistantFile";
import { generateDocumentFile, DOCUMENT_FORMAT_LABEL, DOCUMENT_FORMAT_MIME, type DocumentFormat } from "@/features/chat/lib/generateDocumentFile";
import { AppError, type AppErrorCode } from "@/types/errors";
import type { ChatMessage } from "@/types/chat";

interface MessageRowProps {
  msg: ChatMessage;
  /** Needed to persist attachments back onto the message when "download as file" is used. */
  convId: string;
  onRegenerate: (msg: ChatMessage) => void;
}

const DOCUMENT_FORMATS: DocumentFormat[] = ["docx", "pdf", "xlsx"];

/** "ดาวน์โหลดเป็นไฟล์" — converts the assistant's markdown reply into a real docx/pdf/xlsx, client-side, on demand. */
function DownloadAsFileMenu({ msg, convId }: { msg: ChatMessage; convId: string }) {
  const toast = useToast();
  const { updateMessage } = useConversations();
  const { registerFile } = useFiles();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<DocumentFormat | null>(null);

  const handlePick = async (format: DocumentFormat) => {
    setOpen(false);
    setBusy(format);
    try {
      const blob = await generateDocumentFile(msg.content, format, "opentai-reply");
      const { entry, attachment } = await saveAssistantFile(blob, {
        name: `opentai-reply.${format}`,
        mimeType: DOCUMENT_FORMAT_MIME[format],
        mediaType: "document",
      });
      registerFile(entry);
      updateMessage(convId, msg.id, { attachments: [...(msg.attachments ?? []), attachment] });
      toast("บันทึกไฟล์แล้ว ดูได้ในคลังสื่อ");
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative inline-block">
      <IconButton
        icon={busy ? Loader2 : FileDown}
        size={14}
        title="ดาวน์โหลดเป็นไฟล์"
        onClick={() => setOpen((v) => !v)}
        className={busy ? "animate-spin" : undefined}
      />
      {open && (
        <div className="absolute left-0 top-9 z-10 min-w-[140px] overflow-hidden rounded-md border border-border bg-surface py-1">
          {DOCUMENT_FORMATS.map((format) => (
            <button
              key={format}
              onClick={() => handlePick(format)}
              className="block w-full whitespace-nowrap border-0 bg-transparent px-3 py-1.5 text-left text-[12.5px] text-text hover:bg-surface-sunk"
            >
              {DOCUMENT_FORMAT_LABEL[format]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

export function MessageRow({ msg, convId, onRegenerate }: MessageRowProps) {
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
      {msg.attachments && msg.attachments.length > 0 && <AttachmentList attachments={msg.attachments} />}
      {!msg.streaming && (
        <div className="-ml-2 mt-0.5 flex items-center gap-0.5">
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
          {kind === "text" && !msg.errorCode && msg.content && <DownloadAsFileMenu msg={msg} convId={convId} />}
        </div>
      )}
    </div>
  );
}
