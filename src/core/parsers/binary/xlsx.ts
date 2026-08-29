import { AppError } from "@/types/errors";
import { basePreview, type ParsedFile } from "@/core/parsers/types";

const MAX_ROWS_PER_SHEET = 500; // enough for the model to see structure + real data without blowing up context

/** Reads an .xlsx workbook into a tab-separated text rendering, one section per sheet — entirely in the browser via `exceljs` (already a dependency for document generation). */
export async function parseXlsx(bytes: ArrayBuffer, name: string): Promise<ParsedFile> {
  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);

    const sections: string[] = [];
    let totalRows = 0;

    workbook.eachSheet((sheet) => {
      const lines: string[] = [`## ชีต: ${sheet.name}`];
      let rowCount = 0;
      sheet.eachRow({ includeEmpty: false }, (row) => {
        if (rowCount >= MAX_ROWS_PER_SHEET) return;
        const cells = (row.values as unknown[]).slice(1); // index 0 is unused in exceljs's row.values
        lines.push(cells.map((c) => (c === null || c === undefined ? "" : String(c))).join("\t"));
        rowCount++;
      });
      if (sheet.rowCount > MAX_ROWS_PER_SHEET) {
        lines.push(`… (ตัดไว้ที่ ${MAX_ROWS_PER_SHEET} แถวแรกจากทั้งหมด ${sheet.rowCount} แถว)`);
      }
      totalRows += rowCount;
      sections.push(lines.join("\n"));
    });

    const text = sections.join("\n\n");
    return {
      kind: "xlsx",
      text,
      preview: text.length > 0 ? basePreview(text) : "[ไฟล์ Excel นี้ไม่มีข้อมูล]",
      metadata: {
        sheets: workbook.worksheets.length,
        rowsRead: totalRows,
      },
    };
  } catch (err) {
    throw new AppError("PARSE_FAILED", `อ่านไฟล์ Excel ไม่สำเร็จ: ${name}`, err);
  }
}
