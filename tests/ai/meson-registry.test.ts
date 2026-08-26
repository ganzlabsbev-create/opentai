import { describe, expect, it } from "vitest";
import { getAllMesonEntries, getMesonEntriesByCategory, findMesonByProviderModel } from "@/ai/meson/registry";

describe("ai/meson/registry — Mistral onboarding", () => {
  it("loads without throwing (no duplicate mesonId / provider pairs)", () => {
    expect(() => getAllMesonEntries()).not.toThrow();
  });

  it("never redefines an existing Gemini mesonId or moves it to another category", () => {
    const geminiChatIds = ["meson-1.0", "meson-1.1", "meson-1.2", "meson-1.3", "meson-1.4"];
    for (const id of geminiChatIds) {
      const entry = getAllMesonEntries().find((e) => e.mesonId === id);
      expect(entry?.providerId).toBe("gemini");
      expect(entry?.category).toBe("chat");
    }
  });

  it("appends new Mistral chat models after the last existing 1.x entry instead of overwriting it", () => {
    const chat = getMesonEntriesByCategory("chat");
    const mistralChat = chat.filter((e) => e.providerId === "mistral");
    expect(mistralChat.length).toBeGreaterThan(0);
    for (const entry of mistralChat) {
      const num = Number(entry.mesonId.split("-")[1]?.split(".")[1]);
      expect(num).toBeGreaterThan(4); // last pre-existing Gemini chat entry was meson-1.4
    }
  });

  it("appends the Mistral coding model after the last existing 2.x entry", () => {
    const pro = getMesonEntriesByCategory("pro");
    const mistralPro = pro.filter((e) => e.providerId === "mistral");
    expect(mistralPro.length).toBeGreaterThan(0);
    for (const entry of mistralPro) {
      const num = Number(entry.mesonId.split("-")[1]?.split(".")[1]);
      expect(num).toBeGreaterThan(1); // last pre-existing Gemini pro entry was meson-2.1
    }
  });

  it("binds exactly one Meson entry per (providerId, providerModelId) pair", () => {
    expect(findMesonByProviderModel("mistral", "mistral-medium-3-5")?.mesonId).toBe("meson-1.5");
    expect(findMesonByProviderModel("mistral", "codestral-2508")?.mesonId).toBe("meson-2.2");
  });

  it("does not include DeepSeek — removed per request, provider list is gemini/mistral only", () => {
    const providerIds = new Set(getAllMesonEntries().map((e) => e.providerId));
    expect(providerIds.has("deepseek" as never)).toBe(false);
    const ids = getAllMesonEntries().map((e) => e.providerModelId);
    expect(ids.some((id) => id.startsWith("deepseek"))).toBe(false);
  });
});
