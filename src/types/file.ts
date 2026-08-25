export type FileKind = "txt" | "md" | "json" | "csv" | "code" | "html" | "css" | "xml" | "yaml" | "sql" | "other";

/** Where a file came from — user upload vs. produced by an AI tool (image/tts/video/document). */
export type FileSource = "uploaded" | "ai-generated";

/** Only meaningful when `source === "ai-generated"` — drives the /library tabs. */
export type FileMediaType = "image" | "audio" | "document" | "video";

/**
 * Metadata row stored in IndexedDB (`core/storage`). The actual file bytes
 * live in OPFS (`core/files`), keyed by the same `id` — this record never
 * carries the raw content, only what's needed to list/search/preview it.
 */
export interface FileEntry {
  id: string;
  name: string;
  kind: FileKind;
  mimeType: string;
  /** Size in bytes, as reported by the browser File API. */
  size: number;
  createdAt: number;
  updatedAt: number;
  /** Set when the file belongs to a project's workspace; null = "/files" library. */
  projectId: string | null;
  /** Whether a FileParser successfully extracted text for this file. */
  parsed: boolean;
  /** First ~200 chars of parsed text, cached for quick list/preview rendering. */
  preview: string;
  /**
   * "uploaded" (default) vs. "ai-generated". Added after the original schema —
   * rows written before this field existed don't have it in IndexedDB, so
   * every read path normalizes it via `withFileDefaults` (core/storage/files.ts)
   * instead of assuming it's present.
   */
  source: FileSource;
  /** Only set when source === "ai-generated". Powers the /library tab filter. */
  mediaType?: FileMediaType;
}
