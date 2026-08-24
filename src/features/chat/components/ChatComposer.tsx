"use client";

import { ChevronDown, Paperclip, Send, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFiles } from "@/features/files/store/FilesProvider";

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
}: ChatComposerProps) {
  const { files } = useFiles();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [attachOpen, setAttachOpen] = useState(false);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  const attachedFiles = files.filter((f) => attachedIds.includes(f.id));

  return (
    <div className="px-3 pt-2" style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-[680px]">
        <button onClick={onOpenModel} className="mx-auto mb-2 flex items-center gap-1 border-0 bg-transparent">
          <span className="text-xs text-text-muted">{model}</span>
          <ChevronDown size={13} className="text-text-muted" />
        </button>

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

        <div className="flex items-end gap-1 rounded-3xl border border-border bg-surface-sunk py-1.5 pl-2.5 pr-1.5">
          <button onClick={() => setAttachOpen((v) => !v)} className="shrink-0 border-0 bg-transparent p-1.5">
            <Paperclip size={18} className={attachOpen || attachedFiles.length > 0 ? "text-accent" : "text-text-muted"} />
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
            placeholder="ส่งข้อความ"
            rows={1}
            className="max-h-[140px] flex-1 resize-none border-0 bg-transparent px-0.5 py-1.5 font-sans text-[14.5px] leading-normal text-text outline-none"
          />
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
              disabled={!input.trim()}
              className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-0 ${
                input.trim() ? "cursor-pointer bg-accent" : "cursor-not-allowed bg-surface-elevated"
              }`}
            >
              <Send size={14} className={input.trim() ? "text-accent-text" : "text-text-muted"} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
