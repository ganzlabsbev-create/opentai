/**
 * FileParser interface + TXT/MD/JSON/CSV/HTML/CSS/JS/TS/JSX/TSX/XML/YAML/SQL
 * implementations — ThaiAI_Phase2_Prompt.md item 4.
 */
export type { FileParser, ParsedFile } from "@/core/parsers/types";
export { extOf } from "@/core/parsers/types";
export { pickParser, parseFile, isSupportedFile, MAX_PARSEABLE_BYTES } from "@/core/parsers/registry";
