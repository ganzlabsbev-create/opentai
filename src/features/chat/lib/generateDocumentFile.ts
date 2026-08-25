export type DocumentFormat = "docx" | "pdf" | "xlsx";

export const DOCUMENT_FORMAT_LABEL: Record<DocumentFormat, string> = {
  docx: "Word (.docx)",
  pdf: "PDF (.pdf)",
  xlsx: "Excel (.xlsx)",
};

export const DOCUMENT_FORMAT_MIME: Record<DocumentFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

interface ParsedLine {
  text: string;
  heading: 1 | 2 | 3 | null;
  bullet: boolean;
  bold: boolean;
}

/** Very small line-level markdown reader — enough to make headings/bullets/bold survive the conversion. */
function parseLines(markdown: string): ParsedLine[] {
  return markdown
    .split("\n")
    .filter((raw) => raw.trim().length > 0)
    .map((raw) => {
      const line = raw.trim();
      const h3 = line.match(/^###\s+(.*)/);
      const h2 = line.match(/^##\s+(.*)/);
      const h1 = line.match(/^#\s+(.*)/);
      const bulletMatch = line.match(/^[-*]\s+(.*)/);
      const boldWrapped = /^\*\*(.*)\*\*$/.exec(line);
      const heading = h1 ? 1 : h2 ? 2 : h3 ? 3 : null;
      const text = (h1?.[1] ?? h2?.[1] ?? h3?.[1] ?? bulletMatch?.[1] ?? boldWrapped?.[1] ?? line).replace(/\*\*/g, "");
      return { text, heading, bullet: !!bulletMatch, bold: !!boldWrapped || !!heading };
    });
}

/** Builds a .docx Blob from markdown/plain text via the `docx` package (dynamically imported — it's sizeable). */
async function buildDocx(markdown: string, title: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const lines = parseLines(markdown);

  const headingLevel = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 } as const;

  const children = lines.map((line) => {
    if (line.heading) {
      return new Paragraph({ text: line.text, heading: headingLevel[line.heading] });
    }
    if (line.bullet) {
      return new Paragraph({ text: line.text, bullet: { level: 0 } });
    }
    return new Paragraph({ children: [new TextRun({ text: line.text, bold: line.bold })] });
  });

  const doc = new Document({
    title,
    sections: [{ children: children.length > 0 ? children : [new Paragraph("")] }],
  });
  return Packer.toBlob(doc);
}

/** Builds an .xlsx Blob via `exceljs`. Markdown tables (`| a | b |`) become real rows/columns; everything else is one row per line. */
async function buildXlsx(markdown: string, title: string): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31) || "Sheet1");

  const lines = markdown.split("\n").filter((l) => l.trim().length > 0 && !/^\s*\|?\s*[-:| ]+\s*\|?\s*$/.test(l));
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.includes("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c, i, arr) => !(c === "" && (i === 0 || i === arr.length - 1)));
      sheet.addRow(cells);
    } else {
      sheet.addRow([trimmed.replace(/^#+\s*/, "").replace(/^[-*]\s+/, "").replace(/\*\*/g, "")]);
    }
  }
  sheet.columns.forEach((col) => {
    col.width = 32;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: DOCUMENT_FORMAT_MIME.xlsx });
}

/** Builds a .pdf Blob via `jspdf`, paginating manually since jsPDF doesn't auto-flow long text. */
async function buildPdf(markdown: string, title: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const marginX = 14;
  const maxWidth = 182;
  const lineHeight = 7;
  const pageBottom = 280;
  let y = 18;

  doc.setFontSize(14);
  doc.text(title, marginX, y);
  y += lineHeight * 1.5;
  doc.setFontSize(11);

  for (const line of parseLines(markdown)) {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    const wrapped: string[] = doc.splitTextToSize(line.text, maxWidth);
    for (const w of wrapped) {
      if (y > pageBottom) {
        doc.addPage();
        y = 18;
      }
      doc.text(w, marginX, y);
      y += lineHeight;
    }
    y += 1.5;
  }

  return doc.output("blob");
}

/** Converts an assistant reply (markdown/plain text) into a downloadable document, entirely client-side — no server round trip. */
export async function generateDocumentFile(markdown: string, format: DocumentFormat, title = "opentai-document"): Promise<Blob> {
  if (format === "docx") return buildDocx(markdown, title);
  if (format === "xlsx") return buildXlsx(markdown, title);
  return buildPdf(markdown, title);
}
