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

export async function listFiles(projectId: string | null = null): Promise<FileEntry[]> {
  return withStorageError(async () => {
    const db = getDb();
    const rows =
      projectId === null
        ? await db.files.toArray()
        : await db.files.where("projectId").equals(projectId).toArray();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  });
}

export async function getFileRecord(id: string): Promise<FileEntry | undefined> {
  return withStorageError(async () => getDb().files.get(id));
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
