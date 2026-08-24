/**
 * Local search index + query engine — ThaiAI_Phase2_Prompt.md item 5.
 * Indexes filename + parsed text; no server, no AI — pure client-side
 * scoring so `/files` and the Project workspace can search real content.
 */
export interface SearchDoc {
  id: string;
  name: string;
  text: string;
}

interface IndexedDoc {
  id: string;
  name: string;
  nameLower: string;
  textLower: string;
  text: string;
}

export interface SearchIndex {
  docs: IndexedDoc[];
}

export interface SearchResult {
  id: string;
  name: string;
  score: number;
  /** A short excerpt around the first match, for showing "why" a result matched. */
  snippet: string;
}

export function buildSearchIndex(docs: SearchDoc[]): SearchIndex {
  return {
    docs: docs.map((d) => ({
      id: d.id,
      name: d.name,
      nameLower: d.name.toLowerCase(),
      textLower: d.text.toLowerCase(),
      text: d.text,
    })),
  };
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function snippetAround(text: string, index: number, radius = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return prefix + text.slice(start, end).replace(/\s+/g, " ").trim() + suffix;
}

export function search(index: SearchIndex, query: string, limit = 20): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const doc of index.docs) {
    let score = 0;
    let firstMatchAt = -1;

    for (const term of terms) {
      if (doc.nameLower.includes(term)) score += 5; // filename matches rank highest
      let from = 0;
      let count = 0;
      let at = doc.textLower.indexOf(term, from);
      while (at !== -1) {
        count++;
        if (firstMatchAt === -1) firstMatchAt = at;
        from = at + term.length;
        at = doc.textLower.indexOf(term, from);
      }
      score += count;
    }

    if (score > 0) {
      results.push({
        id: doc.id,
        name: doc.name,
        score,
        snippet: firstMatchAt >= 0 ? snippetAround(doc.text, firstMatchAt) : doc.text.slice(0, 120),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
