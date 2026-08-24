/**
 * IndexedDB wrapper (Dexie) for Conversation/Message/Project/File-metadata/
 * Settings CRUD — ThaiAI_Phase2_Prompt.md item 3.
 */
export { getDb } from "@/core/storage/db";
export type { ConversationRow, MessageRow, SettingsRow } from "@/core/storage/db";

export {
  listConversations,
  createConversationRecord,
  touchConversation,
  appendMessageRecords,
  updateMessageRecord,
  deleteConversationRecord,
  clearAllConversations,
} from "@/core/storage/conversations";

export {
  listProjects,
  createProjectRecord,
  updateProjectRecord,
  deleteProjectRecord,
} from "@/core/storage/projects";

export {
  listFiles,
  getFileRecord,
  putFileRecord,
  updateFileRecord,
  deleteFileRecord,
} from "@/core/storage/files";

export { getSettings, setSettings, resetSettings } from "@/core/storage/settings";

import { getDb } from "@/core/storage/db";

/** Wipes every IndexedDB table. Used by Settings → "รีเซ็ตแอป" (OPFS is cleared separately, see core/files). */
export async function clearAllStorage(): Promise<void> {
  const db = getDb();
  await Promise.all([db.conversations.clear(), db.messages.clear(), db.projects.clear(), db.files.clear(), db.settings.clear()]);
}
