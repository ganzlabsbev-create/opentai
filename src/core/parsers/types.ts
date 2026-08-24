import type { FileKind } from "@/types/file";

export interface ParsedFile {
  kind: FileKind;
  /** Normalized text content, used by core/search and core/context. */
  text: string;
  /** First ~200 chars, used for FileEntry.preview. */
  preview: string;
  /** Parser-specific extra facts (line count, JSON key count, CSV columns, ...). */
  metadata: Record<string, string | number>;
}

export interface FileParser {
  id: string;
  kind: FileKind;
  canParse(name: string, mimeType: string): boolean;
  parse(text: string, name: string): ParsedFile;
}

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function basePreview(text: string, max = 200): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max) + "…" : trimmed;
}

export function lineCount(text: string): number {
  if (text.length === 0) return 0;
  return text.split("\n").length;
}
