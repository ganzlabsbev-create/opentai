"use client";

import { Download, FileArchive, FileAudio, FileText, FileVideo, Image as ImageIcon, Loader2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { readFileBytes } from "@/core/files";
import { useToast } from "@/components/ui/Toast";
import { AppError } from "@/types/errors";
import { formatBytes } from "@/lib/format";
import type { MessageAttachment } from "@/types/chat";

const ICONS: Record<MessageAttachment["mediaType"], LucideIcon> = {
  image: ImageIcon,
  audio: FileAudio,
  video: FileVideo,
  document: FileText,
  archive: FileArchive,
};

/** Reads the file's bytes from OPFS on demand and triggers a browser download. Attachments only carry metadata, not bytes. */
async function downloadAttachment(att: MessageAttachment) {
  const buf = await readFileBytes(att.id);
  const url = URL.createObjectURL(new Blob([buf], { type: att.mimeType }));
  const a = document.createElement("a");
  a.href = url;
  a.download = att.name;
  a.click();
  URL.revokeObjectURL(url);
}

export function AttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const Icon = ICONS[attachment.mediaType];

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAttachment(attachment);
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex w-full items-center gap-2.5 rounded-md border border-border bg-surface-sunk px-3 py-2.5 text-left"
    >
      <Icon size={16} className="shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] text-text">{attachment.name}</div>
        <div className="text-[11px] text-text-muted">{formatBytes(attachment.size)}</div>
      </div>
      {downloading ? (
        <Loader2 size={14} className="shrink-0 animate-spin text-text-muted" />
      ) : (
        <Download size={14} className="shrink-0 text-text-muted" />
      )}
    </button>
  );
}

export function AttachmentList({ attachments }: { attachments: MessageAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {attachments.map((att) => (
        <AttachmentCard key={att.id} attachment={att} />
      ))}
    </div>
  );
}
