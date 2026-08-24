import { clearAllFileBytes, readFileBytes, writeFileBytes } from "@/core/files";
import {
  clearAllStorage,
  createConversationRecord,
  createProjectRecord,
  listConversations,
  listFiles,
  listProjects,
  putFileRecord,
  setSettings,
} from "@/core/storage";
import { getSettings } from "@/core/storage/settings";
import { AppError } from "@/types/errors";
import type { Conversation } from "@/types/chat";
import type { FileEntry } from "@/types/file";
import type { Project } from "@/types/project";
import type { AppSettings } from "@/types/settings";

const BACKUP_VERSION = 1;

interface BackupFile extends FileEntry {
  /** Base64-encoded file bytes, or null if the bytes couldn't be read (e.g. OPFS unsupported). */
  contentBase64: string | null;
}

export interface BackupData {
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  conversations: Conversation[];
  projects: Project[];
  files: BackupFile[];
  settings: AppSettings;
}

function bufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Export / import — ThaiAI_Phase2_Prompt.md item 8. Reads real IndexedDB + OPFS content. */
export async function buildBackup(): Promise<BackupData> {
  const [conversations, projects, files, settings] = await Promise.all([
    listConversations(),
    listProjects(),
    listFiles(),
    getSettings(),
  ]);

  const filesWithContent: BackupFile[] = await Promise.all(
    files.map(async (f) => {
      try {
        const bytes = await readFileBytes(f.id);
        return { ...f, contentBase64: bufferToBase64(bytes) };
      } catch {
        return { ...f, contentBase64: null };
      }
    })
  );

  return {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    conversations,
    projects,
    files: filesWithContent,
    settings,
  };
}

export async function exportBackupBlob(): Promise<Blob> {
  const data = await buildBackup();
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}

function assertBackupShape(data: unknown): asserts data is BackupData {
  if (
    !data ||
    typeof data !== "object" ||
    !("version" in data) ||
    !("conversations" in data) ||
    !("projects" in data) ||
    !("files" in data)
  ) {
    throw new AppError("PARSE_FAILED", "ไฟล์ backup นี้ไม่ถูกต้องหรือเสียหาย");
  }
}

/** Restores a backup, additively (existing local data is cleared first so restore is deterministic). */
export async function importBackup(json: string): Promise<{ conversations: number; projects: number; files: number }> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (err) {
    throw new AppError("PARSE_FAILED", "อ่านไฟล์ backup (JSON) ไม่สำเร็จ", err);
  }
  assertBackupShape(data);

  await clearAllStorage();
  await clearAllFileBytes();

  for (const conv of data.conversations) {
    await createConversationRecord(conv);
  }
  for (const project of data.projects) {
    await createProjectRecord(project);
  }
  for (const file of data.files) {
    const { contentBase64, ...meta } = file;
    await putFileRecord(meta);
    if (contentBase64) {
      await writeFileBytes(meta.id, base64ToBuffer(contentBase64));
    }
  }
  if (data.settings) {
    await setSettings(data.settings);
  }

  return { conversations: data.conversations.length, projects: data.projects.length, files: data.files.length };
}
