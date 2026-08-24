import type { DiffLine } from "@/types/project";

/**
 * Real line-diff engine — ThaiAI_Phase2_Prompt.md item 5.
 * Classic LCS (Longest Common Subsequence) dynamic-programming diff. O(n*m)
 * time/space, which is fine for the file sizes this app deals with (single
 * text files a user dropped in, not multi-megabyte binaries).
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;

  // dp[i][j] = length of LCS of a[i..n) and b[j..m)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", text: "  " + a[i] });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ type: "del", text: "- " + a[i] });
      i++;
    } else {
      out.push({ type: "add", text: "+ " + b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "del", text: "- " + a[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: "add", text: "+ " + b[j] });
    j++;
  }

  return out;
}

/** Collapses long unchanged runs to a few lines of surrounding context, GitHub-diff style. */
export function collapseContext(diff: DiffLine[], contextLines = 3): DiffLine[] {
  const out: DiffLine[] = [];
  let run: DiffLine[] = [];

  const flushRun = (isEdge: { start: boolean; end: boolean }) => {
    if (run.length <= contextLines * 2) {
      out.push(...run);
    } else {
      if (!isEdge.start) out.push(...run.slice(0, contextLines));
      out.push({ type: "ctx", text: `  … ${run.length - contextLines * 2} บรรทัดไม่เปลี่ยนแปลง …` });
      if (!isEdge.end) out.push(...run.slice(-contextLines));
    }
    run = [];
  };

  for (const line of diff) {
    if (line.type === "ctx") {
      run.push(line);
    } else {
      if (run.length) flushRun({ start: out.length === 0, end: false });
      out.push(line);
    }
  }
  if (run.length) flushRun({ start: out.length === 0, end: true });

  return out;
}
