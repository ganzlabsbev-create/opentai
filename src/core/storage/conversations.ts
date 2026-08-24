import { getDb, type MessageRow } from "@/core/storage/db";
import { AppError } from "@/types/errors";
import type { ChatMessage, Conversation } from "@/types/chat";

async function withStorageError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new AppError("STORAGE_FULL", undefined, err);
    }
    throw AppError.from(err);
  }
}

export async function listConversations(): Promise<Conversation[]> {
  return withStorageError(async () => {
    const db = getDb();
    const rows = await db.conversations.orderBy("updatedAt").reverse().toArray();
    const all = await Promise.all(
      rows.map(async (row) => {
        const messages = await db.messages.where("convId").equals(row.id).sortBy("createdAt");
        return { ...row, messages: messages.map(stripRow) } satisfies Conversation;
      })
    );
    return all;
  });
}

export async function createConversationRecord(conv: Conversation): Promise<void> {
  return withStorageError(async () => {
    const db = getDb();
    const { messages, ...row } = conv;
    await db.conversations.put(row);
    if (messages.length) {
      await db.messages.bulkPut(messages.map((m) => toRow(conv.id, m)));
    }
  });
}

export async function touchConversation(id: string, patch: Partial<Omit<Conversation, "id" | "messages">>): Promise<void> {
  return withStorageError(async () => {
    await getDb().conversations.update(id, patch);
  });
}

export async function appendMessageRecords(convId: string, messages: ChatMessage[]): Promise<void> {
  return withStorageError(async () => {
    const db = getDb();
    await db.messages.bulkPut(messages.map((m) => toRow(convId, m)));
    await db.conversations.update(convId, { updatedAt: Date.now() });
  });
}

export async function updateMessageRecord(convId: string, messageId: string, patch: Partial<ChatMessage>): Promise<void> {
  return withStorageError(async () => {
    await getDb().messages.update(messageId, patch);
  });
}

export async function deleteConversationRecord(id: string): Promise<void> {
  return withStorageError(async () => {
    const db = getDb();
    await db.messages.where("convId").equals(id).delete();
    await db.conversations.delete(id);
  });
}

export async function clearAllConversations(): Promise<void> {
  return withStorageError(async () => {
    const db = getDb();
    await db.messages.clear();
    await db.conversations.clear();
  });
}

function toRow(convId: string, m: ChatMessage): MessageRow {
  return { ...m, convId, createdAt: Date.now() };
}

function stripRow(row: MessageRow): ChatMessage {
  const { convId: _convId, createdAt: _createdAt, ...msg } = row;
  return msg;
}
