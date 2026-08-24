export type MessageRole = "user" | "assistant";

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
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
