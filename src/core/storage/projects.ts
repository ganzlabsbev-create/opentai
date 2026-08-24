import { getDb } from "@/core/storage/db";
import { AppError } from "@/types/errors";
import type { Project } from "@/types/project";

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

export async function listProjects(): Promise<Project[]> {
  return withStorageError(async () => getDb().projects.orderBy("updatedAt").reverse().toArray());
}

export async function createProjectRecord(project: Project): Promise<void> {
  return withStorageError(async () => {
    await getDb().projects.put(project);
  });
}

export async function updateProjectRecord(id: string, patch: Partial<Omit<Project, "id">>): Promise<void> {
  return withStorageError(async () => {
    await getDb().projects.update(id, { ...patch, updatedAt: Date.now() });
  });
}

export async function deleteProjectRecord(id: string): Promise<void> {
  return withStorageError(async () => {
    await getDb().projects.delete(id);
  });
}
