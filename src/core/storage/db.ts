import Dexie, { type Table } from "dexie";
import type { ChatMessage, Conversation } from "@/types/chat";
import type { Project } from "@/types/project";
import type { FileEntry } from "@/types/file";

/** Row shape for the `messages` table — Conversation.messages is assembled from these at read time. */
export interface MessageRow extends ChatMessage {
  convId: string;
  createdAt: number;
}

/** Row shape for the `conversations` table (messages live in their own table, see MessageRow). */
export type ConversationRow = Omit<Conversation, "messages">;

/** Single-row-per-key settings store, e.g. { key: "app", value: AppSettings }. */
export interface SettingsRow {
  key: string;
  value: unknown;
}

class ThaiAIDatabase extends Dexie {
  conversations!: Table<ConversationRow, string>;
  messages!: Table<MessageRow, string>;
  projects!: Table<Project, string>;
  files!: Table<FileEntry, string>;
  settings!: Table<SettingsRow, string>;

  constructor() {
    super("thaiai");
    this.version(1).stores({
      conversations: "id, updatedAt",
      messages: "id, convId, createdAt",
      projects: "id, updatedAt",
      files: "id, projectId, updatedAt, name",
      settings: "key",
    });
  }
}

/**
 * Lazily constructed so importing this module never touches `indexedDB` at
 * module-eval time (Next.js evaluates modules during SSR/build, where
 * `indexedDB` doesn't exist). Every core/storage function goes through
 * `getDb()` instead of a top-level `new ThaiAIDatabase()`.
 */
let dbInstance: ThaiAIDatabase | null = null;

export function getDb(): ThaiAIDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment (are you on the server?)");
  }
  if (!dbInstance) {
    dbInstance = new ThaiAIDatabase();
  }
  return dbInstance;
}
