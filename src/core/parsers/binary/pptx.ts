import { AppError } from "@/types/errors";
import { basePreview, type ParsedFile } from "@/core/parsers/types";

/**
 * .pptx is a zip of XML parts (OOXML) — no dedicated pptx-reading library
 * needed. We unzip it with the `jszip` dependency already used elsewhere
 * (exportProjectZip.ts) and pull text runs (`<a:t>`) out of each slide's
 * XML with the browser's native DOMParser. Entirely client-side.
 */
export async function parsePptx(bytes: ArrayBuffer, name: string): Promise<ParsedFile> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(bytes);

    const slideFiles = Object.keys(zip.files)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
        return na - nb;
      });

    if (slideFiles.length === 0) {
      throw new Error("ไม่พบสไลด์ในไฟล์ (โครงสร้างไม่ตรงกับ .pptx มาตรฐาน)");
    }

    const parser = new DOMParser();
    const slideTexts: string[] = [];
    for (const path of slideFiles) {
      const xml = await zip.files[path].async("text");
      const doc = parser.parseFromString(xml, "application/xml");
      // OOXML text runs live in <a:t> nodes regardless of nesting depth
      // (title/body/table/etc placeholders all use the same tag).
      const runs = Array.from(doc.getElementsByTagName("a:t")).map((n) => n.textContent ?? "");
      slideTexts.push(runs.join(" ").trim());
    }

    const text = slideTexts.map((t, i) => `--- สไลด์ ${i + 1} ---\n${t || "(ไม่มีข้อความ)"}`).join("\n\n");
    return {
      kind: "pptx",
      text,
      preview: basePreview(text),
      metadata: { slides: slideFiles.length },
    };
  } catch (err) {
    throw new AppError("PARSE_FAILED", `อ่านไฟล์ PowerPoint ไม่สำเร็จ: ${name}`, err);
  }
}
