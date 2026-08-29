import { AppError } from "@/types/errors";
import { extOf, type ParsedFile } from "@/core/parsers/types";
import { parsePdf } from "@/core/parsers/binary/pdf";
import { parseDocx } from "@/core/parsers/binary/docx";
import { parseXlsx } from "@/core/parsers/binary/xlsx";
import { parsePptx } from "@/core/parsers/binary/pptx";

const BINARY_EXTS = new Set(["pdf", "docx", "xlsx", "pptx"]);

/** Real document files whose bytes are a binary container, not UTF-8 text — need `arrayBuffer()` + an async, format-specific parser instead of `file.text()` + `core/parsers`. */
export function isBinaryDocument(name: string): boolean {
  return BINARY_EXTS.has(extOf(name));
}

/** Larger than MAX_PARSEABLE_BYTES (5MB, sized for text/code) since real-world PDFs/decks/workbooks routinely exceed that while still being reasonable to hold in browser memory. */
export const MAX_BINARY_BYTES = 20 * 1024 * 1024;

export async function parseBinaryDocument(name: string, bytes: ArrayBuffer): Promise<ParsedFile> {
  switch (extOf(name)) {
    case "pdf":
      return parsePdf(bytes, name);
    case "docx":
      return parseDocx(bytes, name);
    case "xlsx":
      return parseXlsx(bytes, name);
    case "pptx":
      return parsePptx(bytes, name);
    default:
      throw new AppError("FILE_UNSUPPORTED", `ไม่รองรับไฟล์: ${name}`);
  }
}
