import { AppError } from "@/types/errors";
import { basePreview, type ParsedFile } from "@/core/parsers/types";

// pdfjs-dist ships its worker as a separate script; instead of wiring up a
// bundler-specific worker entry (finicky under Next.js/webpack across
// versions), point it at the same-version build on a CDN. This keeps PDF
// parsing 100% client-side — no server ever sees the file — at the cost of
// needing network access to fetch the worker script once (cached after).
async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.mjs`;
  }
  return pdfjs;
}

/** Extracts plain text from every page of a PDF, entirely in the browser. */
export async function parsePdf(bytes: ArrayBuffer, name: string): Promise<ParsedFile> {
  try {
    const pdfjs = await getPdfjs();
    const doc = await pdfjs.getDocument({ data: bytes }).promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // `item.str` covers regular text runs; PDF.js also emits marked-content
      // items without `str` (e.g. structure markers) which we skip.
      const line = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      pageTexts.push(line.trim());
    }

    const text = pageTexts.map((t, i) => `--- หน้า ${i + 1} ---\n${t}`).join("\n\n");
    const hasText = pageTexts.some((t) => t.length > 0);

    return {
      kind: "pdf",
      text: hasText ? text : "",
      preview: hasText ? basePreview(text) : `[PDF ${doc.numPages} หน้า — ไม่มีข้อความให้ดึง อาจเป็นไฟล์สแกน/รูปภาพล้วน]`,
      metadata: {
        pages: doc.numPages,
        hasExtractableText: hasText ? "yes" : "no",
      },
    };
  } catch (err) {
    throw new AppError("PARSE_FAILED", `อ่านไฟล์ PDF ไม่สำเร็จ: ${name}`, err);
  }
}
