import { writeFileBytes } from "@/core/files";
import { putFileRecord } from "@/core/storage";
import { nid } from "@/lib/id";
import type { FileEntry, FileMediaType } from "@/types/file";
import type { MessageAttachment } from "@/types/chat";

export interface SaveAssistantFileMeta {
  name: string;
  mimeType: string;
  mediaType: FileMediaType;
  /** Attach to a project's workspace instead of the top-level "/files" library. Defaults to null. */
  projectId?: string | null;
}

export interface SaveAssistantFileResult {
  /** The FileEntry written to IndexedDB — pass to `useFiles().registerFile()` so /library updates immediately. */
  entry: FileEntry;
  /** Ready to push into `ChatMessage.attachments`. */
  attachment: MessageAttachment;
}

function byteLengthOf(data: ArrayBuffer | Blob): number {
  return data instanceof Blob ? data.size : data.byteLength;
}

/**
 * Persists bytes an AI tool produced (image/tts/video/document) exactly the
 * way a real user upload would be persisted — bytes in OPFS via
 * `writeFileBytes`, metadata in IndexedDB via `putFileRecord` — but tagged
 * `source: "ai-generated"` so it shows up under /library and survives
 * navigating away from whatever Studio/composer tool created it (previously
 * these results only lived in local component state and vanished on
 * unmount).
 *
 * Client-side only, same as the rest of core/files + core/storage — nothing
 * here touches the network.
 */
export async function saveAssistantFile(
  bytes: ArrayBuffer | Blob,
  meta: SaveAssistantFileMeta
): Promise<SaveAssistantFileResult> {
  const id = nid("file");
  const now = Date.now();

  await writeFileBytes(id, bytes);

  const entry: FileEntry = {
    id,
    name: meta.name,
    kind: "other",
    mimeType: meta.mimeType,
    size: byteLengthOf(bytes),
    createdAt: now,
    updatedAt: now,
    projectId: meta.projectId ?? null,
    parsed: false,
    preview: "",
    source: "ai-generated",
    mediaType: meta.mediaType,
  };
  await putFileRecord(entry);

  const attachment: MessageAttachment = {
    id,
    name: meta.name,
    mimeType: meta.mimeType,
    size: entry.size,
    mediaType: meta.mediaType,
  };

  return { entry, attachment };
}

/** Decodes a base64 string (as returned by the /api/meson/* routes) into an ArrayBuffer. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Best-effort file extension from a MIME type, e.g. "image/png" -> "png". */
export function extFromMimeType(mimeType: string, fallback = "bin"): string {
  const part = mimeType.split(";")[0]?.split("/")[1];
  if (!part) return fallback;
  return part === "jpeg" ? "jpg" : part;
}
