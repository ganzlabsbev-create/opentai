import { basePreview, extOf, type FileParser } from "@/core/parsers/types";

/** Minimal CSV row splitter — handles quoted fields with embedded commas, not RFC-4180 edge cases like embedded newlines. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export const CsvParser: FileParser = {
  id: "csv",
  kind: "csv",
  canParse: (name) => extOf(name) === "csv",
  parse: (text) => {
    const rows = text.split(/\r?\n/).filter((l) => l.length > 0);
    const header = rows[0] ? splitCsvLine(rows[0]) : [];
    return {
      kind: "csv",
      text,
      preview: basePreview(text),
      metadata: {
        rows: Math.max(0, rows.length - 1),
        columns: header.length,
        headers: header.join(", "),
      },
    };
  },
};
