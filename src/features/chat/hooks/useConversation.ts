"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nid } from "@/lib/id";
import { assembleContext, type ContextSourceFile } from "@/core/context";
import { useConversations } from "@/features/chat/store/ConversationsProvider";
import { useStreaming } from "@/features/chat/hooks/useStreaming";
import { useLiveVoice } from "@/features/chat/hooks/useLiveVoice";
import { useFiles } from "@/features/files/store/FilesProvider";
import { useSettings } from "@/features/settings/store/SettingsProvider";
import { useMesonModels } from "@/features/meson/lib/useMesonModels";
import { mesonPostJson } from "@/features/meson/lib/mesonClient";
import { useVideoJobPolling } from "@/features/meson/hooks/useVideoJobPolling";
import { saveAssistantFile, base64ToArrayBuffer, extFromMimeType } from "@/features/chat/lib/saveAssistantFile";
import { AppError } from "@/types/errors";
import type { ChatMessage } from "@/types/chat";
import type { FileMediaType } from "@/types/file";

/** Tools selectable from the composer's "+" menu that bypass the normal chat stream. */
export type MesonToolKind = "image" | "tts" | "video";

interface ImageGenResponse {
  images: { mimeType: string; base64: string }[];
}
interface TtsGenResponse {
  mimeType: string;
  base64: string;
}
interface VideoStartResponse {
  jobId: string;
  status: "pending";
}

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
  const { files, readFileContent, registerFile } = useFiles();
  const conv = convId ? getConversation(convId) : undefined;

  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const toggleAttach = useCallback((id: string) => {
    setAttachedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }, []);

  // Which Meson "+" menu tool is active in the composer, if any. When set,
  // sendMessage() routes to that tool's /api/meson/* endpoint instead of
  // the normal streaming chat endpoint.
  const [activeTool, setActiveTool] = useState<MesonToolKind | null>(null);

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

  // Auto-pick a model per Meson category so the composer tools work with a
  // single tap ("+" → สร้างรูปภาพ → พิมพ์ prompt → Send) instead of also
  // requiring a model picker inline. Hooks are called unconditionally
  // (not just when that tool is active) to keep hook order stable.
  const imageModels = useMesonModels("image");
  const ttsModels = useMesonModels("tts");
  const videoModels = useMesonModels("video");
  const liveModels = useMesonModels("live");

  const apiKey = settings.apiKeys["meson"];
  const { pollJob, stopAll: stopAllVideoPolling } = useVideoJobPolling();
  useEffect(() => stopAllVideoPolling, [stopAllVideoPolling]);

  const handleLiveError = useCallback(
    (message: string) => {
      const targetId = latestConvId.current;
      if (!targetId) return;
      const errMsg: ChatMessage = { id: nid("msg"), role: "assistant", content: message, kind: "text" };
      appendMessages(targetId, [errMsg]);
    },
    [appendMessages]
  );

  const liveVoice = useLiveVoice(liveModels.selected, handleLiveError);

  // Persists a base64 image/tts/video result to OPFS + IndexedDB (source:
  // "ai-generated") and attaches it to the message so it (a) survives the
  // message's mediaUrl not being reloaded from a fresh data: URL and (b)
  // shows up under /library. Best-effort — a save failure shouldn't hide
  // the mediaUrl the person can already see/play/download inline.
  const persistGeneratedMedia = useCallback(
    async (
      targetId: string,
      msgId: string,
      base64: string,
      mimeType: string,
      mediaType: FileMediaType,
      namePrefix: string
    ) => {
      try {
        const bytes = base64ToArrayBuffer(base64);
        const name = `${namePrefix}.${extFromMimeType(mimeType, mediaType === "image" ? "png" : mediaType === "audio" ? "wav" : "mp4")}`;
        const { entry, attachment } = await saveAssistantFile(bytes, { name, mimeType, mediaType });
        registerFile(entry);
        updateMessage(targetId, msgId, { attachments: [attachment] });
      } catch {
        // Non-fatal: the message already has a working mediaUrl for inline playback/download.
      }
    },
    [registerFile, updateMessage]
  );

  const sendToolMessage = useCallback(
    async (text: string, tool: MesonToolKind) => {
      const content = text.trim();
      if (!content) return;

      let targetId = convId;
      if (!targetId) {
        targetId = createConversation(content);
        onCreated?.(targetId);
      }
      latestConvId.current = targetId;

      const userMsg: ChatMessage = { id: nid("msg"), role: "user", content };
      appendMessages(targetId, [userMsg]);

      if (tool === "image") {
        const mesonId = imageModels.selected;
        const aiMsg: ChatMessage = { id: nid("msg"), role: "assistant", content: "", kind: "image", streaming: true };
        appendMessages(targetId, [aiMsg]);
        if (!mesonId) {
          updateMessage(targetId, aiMsg.id, { streaming: false, errorCode: "MODEL_UNAVAILABLE" });
          return;
        }
        try {
          const data = await mesonPostJson<ImageGenResponse>("/api/meson/image", { mesonId, prompt: content }, apiKey);
          const img = data.images[0];
          if (!img) {
            updateMessage(targetId, aiMsg.id, { streaming: false, errorCode: "PROVIDER_UNAVAILABLE" });
          } else {
            updateMessage(targetId, aiMsg.id, {
              streaming: false,
              mediaUrl: `data:${img.mimeType};base64,${img.base64}`,
            });
            void persistGeneratedMedia(targetId, aiMsg.id, img.base64, img.mimeType, "image", "opentai-image");
          }
        } catch (err) {
          updateMessage(targetId, aiMsg.id, { streaming: false, errorCode: AppError.from(err).code });
        }
        return;
      }

      if (tool === "tts") {
        const mesonId = ttsModels.selected;
        const aiMsg: ChatMessage = { id: nid("msg"), role: "assistant", content: "", kind: "audio", streaming: true };
        appendMessages(targetId, [aiMsg]);
        if (!mesonId) {
          updateMessage(targetId, aiMsg.id, { streaming: false, errorCode: "MODEL_UNAVAILABLE" });
          return;
        }
        try {
          const data = await mesonPostJson<TtsGenResponse>("/api/meson/tts", { mesonId, text: content }, apiKey);
          updateMessage(targetId, aiMsg.id, {
            streaming: false,
            mediaUrl: `data:${data.mimeType};base64,${data.base64}`,
          });
          void persistGeneratedMedia(targetId, aiMsg.id, data.base64, data.mimeType, "audio", "opentai-audio");
        } catch (err) {
          updateMessage(targetId, aiMsg.id, { streaming: false, errorCode: AppError.from(err).code });
        }
        return;
      }

      if (tool === "video") {
        const mesonId = videoModels.selected;
        const aiMsg: ChatMessage = {
          id: nid("msg"),
          role: "assistant",
          content: "",
          kind: "video",
          mediaStatus: "generating",
        };
        appendMessages(targetId, [aiMsg]);
        if (!mesonId) {
          updateMessage(targetId, aiMsg.id, { mediaStatus: "failed", errorCode: "MODEL_UNAVAILABLE" });
          return;
        }
        try {
          const data = await mesonPostJson<VideoStartResponse>("/api/meson/video", { mesonId, prompt: content }, apiKey);
          updateMessage(targetId, aiMsg.id, { jobId: data.jobId });
          pollJob(data.jobId, {
            onDone: (media) => {
              const mediaUrl = media.base64 ? `data:${media.base64.mimeType};base64,${media.base64.data}` : media.uri;
              if (mediaUrl) {
                updateMessage(targetId!, aiMsg.id, { mediaStatus: "ready", mediaUrl });
                if (media.base64) {
                  void persistGeneratedMedia(
                    targetId!,
                    aiMsg.id,
                    media.base64.data,
                    media.base64.mimeType,
                    "video",
                    "opentai-video"
                  );
                }
              } else {
                updateMessage(targetId!, aiMsg.id, { mediaStatus: "failed", errorCode: "PROVIDER_UNAVAILABLE" });
              }
            },
            onFailed: () => {
              updateMessage(targetId!, aiMsg.id, { mediaStatus: "failed", errorCode: "PROVIDER_UNAVAILABLE" });
            },
            onError: (err) => {
              updateMessage(targetId!, aiMsg.id, { mediaStatus: "failed", errorCode: err.code });
            },
          });
        } catch (err) {
          updateMessage(targetId, aiMsg.id, { mediaStatus: "failed", errorCode: AppError.from(err).code });
        }
      }
    },
    [
      convId,
      createConversation,
      onCreated,
      appendMessages,
      updateMessage,
      apiKey,
      imageModels.selected,
      ttsModels.selected,
      videoModels.selected,
      pollJob,
      persistGeneratedMedia,
    ]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content) return;

      if (activeTool) {
        await sendToolMessage(content, activeTool);
        return;
      }

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
    [
      activeTool,
      sendToolMessage,
      convId,
      conv?.messages,
      createConversation,
      appendMessages,
      onCreated,
      start,
      attachedIds,
      files,
      readFileContent,
      settings,
    ]
  );

  return {
    conv,
    isStreaming,
    sendMessage,
    stopStreaming: stop,
    attachedIds,
    toggleAttach,
    files,
    activeTool,
    setActiveTool,
    liveVoice,
  };
}
