"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { nid } from "@/lib/id";
import {
  appendMessageRecords,
  clearAllConversations,
  createConversationRecord,
  deleteConversationRecord,
  listConversations,
  updateMessageRecord,
} from "@/core/storage";
import { AppError } from "@/types/errors";
import { useToast } from "@/components/ui/Toast";
import type { ChatMessage, Conversation } from "@/types/chat";

interface ConversationsCtxValue {
  conversations: Conversation[];
  loaded: boolean;
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  getConversation: (id: string) => Conversation | undefined;
  createConversation: (firstText?: string) => string;
  appendMessages: (convId: string, messages: ChatMessage[]) => void;
  updateMessage: (convId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  deleteConversation: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

const ConversationsContext = createContext<ConversationsCtxValue | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listConversations()
      .then(setConversations)
      .catch((err) => toast(AppError.from(err).userMessage, "danger"))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getConversation = useCallback((id: string) => conversations.find((c) => c.id === id), [conversations]);

  const createConversation = useCallback((firstText?: string) => {
    const id = nid("conv");
    const now = Date.now();
    const conv: Conversation = { id, title: firstText ? firstText.slice(0, 24) : "แชทใหม่", messages: [], createdAt: now, updatedAt: now };
    setConversations((cs) => [conv, ...cs]);
    setActiveConvId(id);
    createConversationRecord(conv).catch((err) => toast(AppError.from(err).userMessage, "danger"));
    return id;
  }, [toast]);

  const appendMessages = useCallback(
    (convId: string, messages: ChatMessage[]) => {
      setConversations((cs) =>
        cs.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, ...messages], updatedAt: Date.now() } : c))
      );
      appendMessageRecords(convId, messages).catch((err) => toast(AppError.from(err).userMessage, "danger"));
    },
    [toast]
  );

  const updateMessage = useCallback(
    (convId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setConversations((cs) =>
        cs.map((c) =>
          c.id === convId
            ? { ...c, messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) }
            : c
        )
      );
      // Streaming deltas fire frequently; only the final settled state needs
      // to hit IndexedDB every time, but writing each patch keeps the
      // persisted copy correct even if the tab closes mid-stream.
      updateMessageRecord(convId, messageId, patch).catch((err) => toast(AppError.from(err).userMessage, "danger"));
    },
    [toast]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (activeConvId === id) setActiveConvId(null);
      try {
        await deleteConversationRecord(id);
      } catch (err) {
        toast(AppError.from(err).userMessage, "danger");
      }
    },
    [activeConvId, toast]
  );

  const clearAllHistory = useCallback(async () => {
    setConversations([]);
    setActiveConvId(null);
    try {
      await clearAllConversations();
      toast("ล้างประวัติแชทแล้ว");
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    }
  }, [toast]);

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        loaded,
        activeConvId,
        setActiveConvId,
        getConversation,
        createConversation,
        appendMessages,
        updateMessage,
        deleteConversation,
        clearAllHistory,
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) throw new Error("useConversations must be used within ConversationsProvider");
  return ctx;
}
