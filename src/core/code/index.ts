/**
 * Simple regex-based import/export metadata extraction — deliberately not a
 * full AST parser (no bundled parser library, per ThaiAI_Architecture.md's
 * "WASM เมื่อจำเป็น" — this doesn't rise to that). Good enough to answer
 * "what does this file import" and power the Project workspace's
 * "หา dependency" action across real project files.
 */
export interface CodeMetadata {
  imports: string[];
  exports: string[];
  functions: string[];
}

const IMPORT_RE = /import\s+(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/g;
const REQUIRE_RE = /require\(\s*["']([^"']+)["']\s*\)/g;
const EXPORT_NAMED_RE = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g;
const EXPORT_DEFAULT_RE = /export\s+default\s+(?!function|class)/;
const FUNCTION_RE = /(?:function\s+([A-Za-z0-9_$]+)\s*\(|const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)/g;

export function extractCodeMetadata(text: string): CodeMetadata {
  const imports = new Set<string>();
  for (const m of text.matchAll(IMPORT_RE)) if (m[1]) imports.add(m[1]);
  for (const m of text.matchAll(REQUIRE_RE)) if (m[1]) imports.add(m[1]);

  const exports = new Set<string>();
  for (const m of text.matchAll(EXPORT_NAMED_RE)) if (m[1]) exports.add(m[1]);
  if (EXPORT_DEFAULT_RE.test(text)) exports.add("default");

  const functions = new Set<string>();
  for (const m of text.matchAll(FUNCTION_RE)) {
    const name = m[1] ?? m[2];
    if (name) functions.add(name);
  }

  return { imports: [...imports], exports: [...exports], functions: [...functions] };
}
