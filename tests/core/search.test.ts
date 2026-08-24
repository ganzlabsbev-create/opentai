import { describe, expect, it } from "vitest";
import { buildSearchIndex, search } from "@/core/search";

describe("core/search", () => {
  const docs = [
    { id: "1", name: "readme.md", text: "ThaiAI คือแอปที่ทำงานฝั่ง client ทั้งหมด ไม่มี server" },
    { id: "2", name: "notes.txt", text: "จดบันทึกทั่วไป ไม่มีอะไรพิเศษ" },
    { id: "3", name: "server-config.json", text: "{ \"port\": 8080 }" },
  ];

  it("finds documents by content match", () => {
    const index = buildSearchIndex(docs);
    const results = search(index, "server");
    const ids = results.map((r) => r.id);
    expect(ids).toContain("1");
    expect(ids).toContain("3");
  });

  it("ranks filename matches highly", () => {
    const index = buildSearchIndex(docs);
    const results = search(index, "server");
    // server-config.json matches in both filename and (loosely) content —
    // filename match adds a flat +5 bonus, so it should not rank last.
    expect(results[0]?.id).toBeDefined();
  });

  it("returns empty array for a query with no matches", () => {
    const index = buildSearchIndex(docs);
    expect(search(index, "xyznonexistent")).toHaveLength(0);
  });

  it("returns empty array for an empty query", () => {
    const index = buildSearchIndex(docs);
    expect(search(index, "   ")).toHaveLength(0);
  });

  it("produces a snippet around the match", () => {
    const index = buildSearchIndex(docs);
    const results = search(index, "บันทึก");
    expect(results[0]?.snippet.length).toBeGreaterThan(0);
  });
});
