import { AppError } from "@/types/errors";
import { basePreview, extOf, lineCount, type FileParser } from "@/core/parsers/types";

function countKeys(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((sum, v) => sum + countKeys(v), 0);
  if (value && typeof value === "object") {
    return Object.keys(value).length + Object.values(value).reduce<number>((sum, v) => sum + countKeys(v), 0);
  }
  return 0;
}

export const JsonParser: FileParser = {
  id: "json",
  kind: "json",
  canParse: (name) => extOf(name) === "json",
  parse: (text, name) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new AppError("PARSE_FAILED", `แปลง JSON ไม่สำเร็จ: ${name}`, err);
    }
    const isArray = Array.isArray(parsed);
    return {
      kind: "json",
      text,
      preview: basePreview(text),
      metadata: {
        lines: lineCount(text),
        rootType: isArray ? "array" : typeof parsed,
        keys: countKeys(parsed),
        ...(isArray ? { items: (parsed as unknown[]).length } : {}),
      },
    };
  },
};
