import { AppError } from "@/types/errors";
import { basePreview, type ParsedFile } from "@/core/parsers/types";

/** Extracts plain text from a .docx, entirely in the browser (mammoth's browser build, no server). */
export async function parseDocx(bytes: ArrayBuffer, name: string): Promise<ParsedFile> {
  try {
    const mod = await import("mammoth");
    // mammoth is CJS; depending on bundler interop this lands either as
    // `mod.default` (the whole module.exports) or spread directly onto
    // `mod` — try both so this doesn't silently break under one config.
    const mammoth = (mod as { default?: typeof mod }).default ?? mod;
    const result = await mammoth.extractRawText({ arrayBuffer: bytes });
    const text = result.value.trim();
    return {
      kind: "docx",
      text,
      preview: text.length > 0 ? basePreview(text) : "[Word doc นี้ไม่มีข้อความให้ดึง]",
      metadata: {
        // mammoth surfaces conversion warnings (unsupported styles, images
        // it skipped, etc.) rather than throwing — worth keeping a count so
        // the UI/preview can flag "extracted but imperfectly" if it matters.
        warnings: result.messages.length,
      },
    };
  } catch (err) {
    throw new AppError("PARSE_FAILED", `อ่านไฟล์ Word ไม่สำเร็จ: ${name}`, err);
  }
}
