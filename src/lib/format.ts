import { FileText, FileJson, FileCode2, FileSpreadsheet, FileType, Presentation, type LucideIcon } from "lucide-react";
import type { FileKind } from "@/types/file";

export function fileIcon(type: FileKind): LucideIcon {
  if (type === "json") return FileJson;
  if (type === "code") return FileCode2;
  if (type === "csv" || type === "xlsx") return FileSpreadsheet;
  if (type === "html" || type === "xml") return FileType;
  if (type === "pptx") return Presentation;
  return FileText; // txt/md/css/yaml/sql/pdf/docx/other
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/** Thai-locale relative time (e.g. "2 ชม.ที่แล้ว", "เมื่อวาน"). */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHr < 24) return `${diffHr} ชม.ที่แล้ว`;
  if (diffDay === 1) return "เมื่อวาน";
  if (diffDay < 7) return `${diffDay} วันก่อน`;
  return new Date(timestamp).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
