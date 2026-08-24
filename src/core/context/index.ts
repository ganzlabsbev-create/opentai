import type { SearchResult } from "@/core/search";

/**
 * Context budget/assembly engine — ThaiAI_Phase2_Prompt.md item 5.
 * Builds the text block sent to an AI provider from real selected files +
 * real search results, trimmed to a token budget the UI can show honestly
 * (no fixed placeholder number).
 */
export interface ContextSourceFile {
  id: string;
  name: string;
  text: string;
}

export interface AssembledContext {
  text: string;
  estimatedTokens: number;
  includedFileIds: string[];
  truncated: boolean;
}

/** Rough heuristic (~4 chars/token) — good enough for a budget UI, not billing-accurate. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const DEFAULT_BUDGET_TOKENS = 6000;

export function assembleContext(
  files: ContextSourceFile[],
  searchResults: SearchResult[] = [],
  budgetTokens: number = DEFAULT_BUDGET_TOKENS
): AssembledContext {
  const parts: string[] = [];
  const includedFileIds: string[] = [];
  let usedTokens = 0;
  let truncated = false;

  for (const file of files) {
    const block = `### ${file.name}\n\`\`\`\n${file.text}\n\`\`\`\n`;
    const blockTokens = estimateTokens(block);
    if (usedTokens + blockTokens > budgetTokens) {
      truncated = true;
      continue;
    }
    parts.push(block);
    includedFileIds.push(file.id);
    usedTokens += blockTokens;
  }

  if (searchResults.length > 0) {
    const header = "### ผลการค้นหาที่เกี่ยวข้อง\n";
    const headerTokens = estimateTokens(header);
    if (usedTokens + headerTokens <= budgetTokens) {
      parts.push(header);
      usedTokens += headerTokens;
      for (const r of searchResults) {
        const line = `- **${r.name}**: ${r.snippet}\n`;
        const lineTokens = estimateTokens(line);
        if (usedTokens + lineTokens > budgetTokens) {
          truncated = true;
          break;
        }
        parts.push(line);
        usedTokens += lineTokens;
      }
    } else {
      truncated = true;
    }
  }

  return { text: parts.join("\n"), estimatedTokens: usedTokens, includedFileIds, truncated };
}
