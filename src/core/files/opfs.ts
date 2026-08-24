import { AppError } from "@/types/errors";

const DIR_NAME = "thaiai-files";

function fileNameFor(id: string): string {
  // OPFS entries live flat in one directory; ids are already unique UUID-ish
  // strings (see lib/id.ts) so no extra namespacing is needed.
  return `${id}.bin`;
}

export function isOPFSSupported(): boolean {
  return typeof navigator !== "undefined" && "storage" in navigator && "getDirectory" in navigator.storage;
}

async function getRootDir(): Promise<FileSystemDirectoryHandle> {
  if (!isOPFSSupported()) {
    throw new AppError("STORAGE_FULL", "เบราว์เซอร์นี้ไม่รองรับ Origin Private File System (OPFS)");
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR_NAME, { create: true });
}

/** Writes bytes for `id`, overwriting any existing content. */
export async function writeFileBytes(id: string, data: Blob | ArrayBuffer | string): Promise<void> {
  try {
    const dir = await getRootDir();
    const handle = await dir.getFileHandle(fileNameFor(id), { create: true });
    // createWritable is the standard OPFS write API; not present in older
    // Safari, which is a known limitation noted in Settings → storage.
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
  } catch (err) {
    if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.name === "NotAllowedError")) {
      throw new AppError("STORAGE_FULL", undefined, err);
    }
    throw AppError.from(err);
  }
}

/** Reads bytes for `id` as an ArrayBuffer. Throws PARSE_FAILED-adjacent UNKNOWN if missing. */
export async function readFileBytes(id: string): Promise<ArrayBuffer> {
  try {
    const dir = await getRootDir();
    const handle = await dir.getFileHandle(fileNameFor(id));
    const file = await handle.getFile();
    return await file.arrayBuffer();
  } catch (err) {
    throw AppError.from(err);
  }
}

/** Reads bytes for `id` decoded as UTF-8 text. */
export async function readFileText(id: string): Promise<string> {
  const buf = await readFileBytes(id);
  return new TextDecoder("utf-8").decode(buf);
}

export async function deleteFileBytes(id: string): Promise<void> {
  try {
    const dir = await getRootDir();
    await dir.removeEntry(fileNameFor(id));
  } catch (err) {
    // Deleting something that's already gone shouldn't be a hard failure —
    // callers (e.g. removeFile) treat NotFoundError as a no-op success.
    if (err instanceof DOMException && err.name === "NotFoundError") return;
    throw AppError.from(err);
  }
}

/** Wipes every stored file's bytes. Used by Settings → "รีเซ็ตแอป". */
export async function clearAllFileBytes(): Promise<void> {
  if (!isOPFSSupported()) return;
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(DIR_NAME, { recursive: true });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") return;
    throw AppError.from(err);
  }
}
