"use client";

import { Copy, Loader2, RotateCcw } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { MarkdownMessage } from "@/components/shared/MarkdownMessage";
import { useToast } from "@/components/ui/Toast";
import { AppError, type AppErrorCode } from "@/types/errors";
import type { ChatMessage } from "@/types/chat";

interface MessageRowProps {
  msg: ChatMessage;
  onRegenerate: (msg: ChatMessage) => void;
}

export function MessageRow({ msg, onRegenerate }: MessageRowProps) {
  const toast = useToast();
  const isUser = msg.role === "user";

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
      {msg.streaming && !msg.content ? (
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
