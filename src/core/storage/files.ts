import { getDb } from "@/core/storage/db";
import { AppError } from "@/types/errors";
import type { FileEntry } from "@/types/file";

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

/**
 * `source` was added after the original `files` table shape shipped, so
 * rows written before that migration don't carry it in IndexedDB. Every
 * read path goes through this instead of trusting the raw row, so old
 * records fall back to "uploaded" (they were all uploads pre-/library).
 */
function withFileDefaults(row: FileEntry): FileEntry {
  return row.source ? row : { ...row, source: "uploaded" };
}

export async function listFiles(projectId: string | null = null): Promise<FileEntry[]> {
  return withStorageError(async () => {
    const db = getDb();
    const rows =
      projectId === null
        ? await db.files.toArray()
        : await db.files.where("projectId").equals(projectId).toArray();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt).map(withFileDefaults);
  });
}

export async function getFileRecord(id: string): Promise<FileEntry | undefined> {
  return withStorageError(async () => {
    const row = await getDb().files.get(id);
    return row ? withFileDefaults(row) : row;
  });
}

export async function putFileRecord(file: FileEntry): Promise<void> {
  return withStorageError(async () => {
    await getDb().files.put(file);
  });
}

export async function updateFileRecord(id: string, patch: Partial<Omit<FileEntry, "id">>): Promise<void> {
  return withStorageError(async () => {
    await getDb().files.update(id, patch);
  });
}

export async function deleteFileRecord(id: string): Promise<void> {
  return withStorageError(async () => {
    await getDb().files.delete(id);
  });
}
