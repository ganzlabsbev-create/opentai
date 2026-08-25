export type MessageRole = "user" | "assistant";

/**
 * A file rendered as a downloadable card at the end of a message (see
 * MessageRow.tsx). `id` matches a real FileEntry.id — bytes live in OPFS,
 * this is only the display metadata carried on the message itself.
 */
export interface MessageAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  mediaType: "image" | "audio" | "document" | "video" | "archive";
}

/**
 * What kind of payload this message carries. Defaults to "text" (the
 * original chat-streaming path). The other kinds are produced by the
 * in-composer Meson tools (image/tts/video generation) — see
 * ChatComposer.tsx + useConversation.ts.
 */
export type MessageKind = "text" | "image" | "video" | "audio";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  streaming?: boolean;
  /** Set when generation failed — rendered instead of / alongside content. */
  errorCode?: string;
  /** Which provider/model produced this assistant message. */
  providerId?: string;
  modelId?: string;
  /** What to render this message as. Defaults to "text" when unset. */
  kind?: MessageKind;
  /** Data URL (or remote URL) for image/video/audio kinds once available. */
  mediaUrl?: string;
  /** Only meaningful for kind:"video" — polling state for the async job. */
  mediaStatus?: "generating" | "ready" | "failed";
  /** Only meaningful for kind:"video" — id used to poll /api/meson/video/[jobId]. */
  jobId?: string;
  /** Downloadable files produced for this message — see saveAssistantFile(). */
  attachments?: MessageAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
