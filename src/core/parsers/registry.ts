import { AppError } from "@/types/errors";
import { CodeParser } from "@/core/parsers/code";
import { CsvParser } from "@/core/parsers/csv";
import { JsonParser } from "@/core/parsers/json";
import { CssParser, HtmlParser, XmlParser } from "@/core/parsers/markup";
import { MarkdownParser, TextParser } from "@/core/parsers/text";
import type { FileParser, ParsedFile } from "@/core/parsers/types";
import { extOf } from "@/core/parsers/types";
import { SqlParser, YamlParser } from "@/core/parsers/yaml_sql";
import { isBinaryDocument } from "@/core/parsers/binary/registry";

/** Order matters: more specific extensions first, TextParser (accepts `""`) last. */
const PARSERS: FileParser[] = [
  JsonParser,
  CsvParser,
  MarkdownParser,
  CodeParser,
  HtmlParser,
  CssParser,
  XmlParser,
  YamlParser,
  SqlParser,
  TextParser,
];

const SUPPORTED_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "xml",
  "yaml",
  "yml",
  "sql",
]);

export const MAX_PARSEABLE_BYTES = 5 * 1024 * 1024; // 5 MB — generous for text/code files a browser should hold in memory.

export function isSupportedFile(name: string): boolean {
  const ext = extOf(name);
  return ext === "" || SUPPORTED_EXTS.has(ext) || isBinaryDocument(name);
}

export function pickParser(name: string, mimeType = ""): FileParser {
  const parser = PARSERS.find((p) => p.canParse(name, mimeType));
  if (!parser) throw new AppError("FILE_UNSUPPORTED", `ไม่รองรับไฟล์: ${name}`);
  return parser;
}

export function parseFile(name: string, text: string, mimeType = ""): ParsedFile {
  const parser = pickParser(name, mimeType);
  return parser.parse(text, name);
}
