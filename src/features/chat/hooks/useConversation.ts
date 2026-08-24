"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nid } from "@/lib/id";
import { assembleContext, type ContextSourceFile } from "@/core/context";
import { useConversations } from "@/features/chat/store/ConversationsProvider";
import { useStreaming } from "@/features/chat/hooks/useStreaming";
import { useFiles } from "@/features/files/store/FilesProvider";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { AppError } from "@/types/errors";
import type { ChatMessage } from "@/types/chat";

/**
 * @param convId  Existing conversation id, or null when on the chat root
 *                ("/") before the first message has been sent.
 * @param onCreated  Called with the freshly created id right after the
 *                    first message of a brand-new conversation is sent,
 *                    so the page can router.push(`/chat/${id}`).
 */
export function useConversation(convId: string | null, onCreated?: (id: string) => void) {
  const { getConversation, createConversation, appendMessages, updateMessage, setActiveConvId } = useConversations();
  const { settings } = useSettings();
  const { files, readFileContent } = useFiles();
  const conv = convId ? getConversation(convId) : undefined;

  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const toggleAttach = useCallback((id: string) => {
    setAttachedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }, []);

  useEffect(() => {
    setActiveConvId(convId);
  }, [convId, setActiveConvId]);

  // Refs so the streaming callbacks (created once) always target the
  // conversation/message that was active when send() was called.
  const latestConvId = useRef<string | null>(convId);
  const latestAiMsgId = useRef<string | null>(null);

  const { isStreaming, start, stop } = useStreaming({
    onChunk: (chunk, done) => {
      const targetId = latestConvId.current;
      const msgId = latestAiMsgId.current;
      if (!targetId || !msgId) return;
      updateMessage(targetId, msgId, { content: chunk, streaming: !done });
    },
    onProviderSelected: (providerId, modelId) => {
      const targetId = latestConvId.current;
      const msgId = latestAiMsgId.current;
      if (!targetId || !msgId) return;
      updateMessage(targetId, msgId, { providerId, modelId });
    },
    onError: (err: AppError) => {
      const targetId = latestConvId.current;
      const msgId = latestAiMsgId.current;
      if (!targetId || !msgId) return;
      updateMessage(targetId, msgId, { streaming: false, errorCode: err.code });
    },
  });

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content) return;

      let targetId = convId;
      if (!targetId) {
        targetId = createConversation(content);
        onCreated?.(targetId);
      }
      latestConvId.current = targetId;

      const userMsg: ChatMessage = { id: nid("msg"), role: "user", content };
      const aiMsg: ChatMessage = { id: nid("msg"), role: "assistant", content: "", streaming: true };
      latestAiMsgId.current = aiMsg.id;

      const priorMessages = conv?.messages ?? [];
      appendMessages(targetId, [userMsg, aiMsg]);

      const history = [...priorMessages, userMsg]
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      let context: string | undefined;
      if (attachedIds.length > 0) {
        const contextFiles: ContextSourceFile[] = await Promise.all(
          attachedIds.map(async (id) => {
            const file = files.find((f) => f.id === id);
            const text = await readFileContent(id).catch(() => file?.preview ?? "");
            return { id, name: file?.name ?? id, text };
          })
        );
        context = assembleContext(contextFiles).text;
      }

      start({ messages: history, context, settings });
    },
    [convId, conv?.messages, createConversation, appendMessages, onCreated, start, attachedIds, files, readFileContent, settings]
  );

  return { conv, isStreaming, sendMessage, stopStreaming: stop, attachedIds, toggleAttach, files };
}
