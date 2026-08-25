import { readFileBytes } from "@/core/files";
import type { FileEntry } from "@/types/file";

/** Above this combined size we still zip, but the caller should show a warning first — see exportProjectZip's `onLargeExport`. */
export const LARGE_EXPORT_WARNING_BYTES = 200 * 1024 * 1024; // 200MB

function sanitizeFolderName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "project";
}

/** Avoids silently dropping files when two files in the same project share a name. */
function uniqueName(used: Set<string>, name: string): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot === -1 ? name : name.slice(0, dot);
  const ext = dot === -1 ? "" : name.slice(dot);
  let i = 2;
  let candidate = `${base} (${i})${ext}`;
  while (used.has(candidate)) {
    i++;
    candidate = `${base} (${i})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export interface ExportProjectZipOptions {
  /** Called with the combined byte size before zipping starts, in case the caller wants to confirm with the person first. */
  onLargeExport?: (totalBytes: number) => Promise<boolean> | boolean;
  /** Called after each file is read into the archive, for a progress indicator. */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Builds a zip containing every file attached to `projectId`, all inside one
 * top-level folder named after the project, and triggers a browser
 * download. Reads bytes straight from OPFS via `readFileBytes` — nothing is
 * uploaded anywhere.
 */
export async function exportProjectZip(
  projectName: string,
  files: FileEntry[],
  options: ExportProjectZipOptions = {}
): Promise<void> {
  if (files.length === 0) return;

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > LARGE_EXPORT_WARNING_BYTES && options.onLargeExport) {
    const proceed = await options.onLargeExport(totalBytes);
    if (!proceed) return;
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder(sanitizeFolderName(projectName)) ?? zip;
  const used = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const bytes = await readFileBytes(file.id);
    folder.file(uniqueName(used, file.name), bytes);
    options.onProgress?.(i + 1, files.length);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFolderName(projectName)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
