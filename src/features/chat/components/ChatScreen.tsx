"use client";

import { useEffect, useRef } from "react";
import { ChatComposer } from "@/features/chat/components/ChatComposer";
import { MessageRow } from "@/features/chat/components/MessageRow";
import type { MesonToolKind } from "@/features/chat/hooks/useConversation";
import type { useLiveVoice } from "@/features/chat/hooks/useLiveVoice";
import type { ChatMessage, Conversation } from "@/types/chat";

const SUGGESTIONS = ["อธิบายโค้ดชิ้นนี้", "หา bug ในไฟล์แนบ", "สรุป README", "เขียนฟังก์ชันเรียงคำไทย"];

interface ChatScreenProps {
  conv: Conversation | undefined;
  input: string;
  setInput: (v: string) => void;
  onSend: (text?: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  model: string;
  onOpenModel: () => void;
  attachedIds: string[];
  onToggleAttach: (id: string) => void;
  activeTool: MesonToolKind | null;
  onSetActiveTool: (tool: MesonToolKind | null) => void;
  liveVoice: ReturnType<typeof useLiveVoice>;
}

export function ChatScreen({
  conv,
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
}: ChatScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsg = conv?.messages[conv.messages.length - 1];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conv?.messages.length, lastMsg?.content]);

  const hasMessages = !!conv && conv.messages.length > 0;

  const regenerate = (msg: ChatMessage) => {
    if (!conv) return;
    const idx = conv.messages.findIndex((m) => m.id === msg.id);
    const lastUser = [...conv.messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (lastUser) onSend(lastUser.content);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!hasMessages ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-accent p-[9px]">
              <img src="/brand/ot-mark-white.svg" alt="" className="h-full w-full dark:hidden" />
              <img src="/brand/ot-mark.svg" alt="" className="hidden h-full w-full dark:block" />
            </div>
            <div className="text-[19px] font-bold text-text">คุยกับ OpenTai</div>
            <div className="mt-0.5 text-[13px] text-text-muted">ถามอะไรก็ได้ หรือแนบไฟล์เพื่อเริ่ม</div>
          </div>
          <div className="flex w-full max-w-[420px] gap-2 overflow-x-auto pb-0.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSend(s)}
                className="shrink-0 whitespace-nowrap rounded-full border border-border bg-surface px-3.5 py-2 text-[12.5px] text-text"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto max-w-[680px]">
            {conv.messages.map((m) => (
              <MessageRow key={m.id} msg={m} convId={conv.id} onRegenerate={regenerate} />
            ))}
          </div>
        </div>
      )}

      <ChatComposer
        input={input}
        setInput={setInput}
        onSend={() => onSend()}
        isStreaming={isStreaming}
        onStop={onStop}
        model={model}
        onOpenModel={onOpenModel}
        attachedIds={attachedIds}
        onToggleAttach={onToggleAttach}
        activeTool={activeTool}
        onSetActiveTool={onSetActiveTool}
        liveVoice={liveVoice}
      />
    </div>
  );
}
