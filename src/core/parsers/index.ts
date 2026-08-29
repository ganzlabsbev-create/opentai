/**
 * FileParser interface + TXT/MD/JSON/CSV/HTML/CSS/JS/TS/JSX/TSX/XML/YAML/SQL
 * implementations — ThaiAI_Phase2_Prompt.md item 4.
 * Plus binary document readers (PDF/DOCX/XLSX/PPTX) — core/parsers/binary.
 */
export type { FileParser, ParsedFile } from "@/core/parsers/types";
export { extOf } from "@/core/parsers/types";
export { pickParser, parseFile, isSupportedFile, MAX_PARSEABLE_BYTES } from "@/core/parsers/registry";
export { isBinaryDocument, parseBinaryDocument, MAX_BINARY_BYTES } from "@/core/parsers/binary/registry";
