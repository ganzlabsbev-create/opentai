import { describe, expect, it, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { resolveProviderKey, resolveGeminiKey, MesonKeyError } from "@/ai/meson/key-resolution";

vi.mock("@/ai/meson/rate-limit", () => ({
  checkAndConsumeSharedKeyQuota: vi.fn().mockResolvedValue({ allowed: true, remaining: 19, limit: 20 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/meson/chat", { headers });
}

describe("ai/meson/key-resolution — multi-provider", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws MesonKeyError (not a crash) when a provider has no shared key and no BYOK header", async () => {
    delete process.env.MISTRAL_API_KEY;
    await expect(resolveProviderKey(makeReq(), "mistral")).rejects.toBeInstanceOf(MesonKeyError);
  });

  it("falls back to the provider's shared env key when no BYOK header is sent", async () => {
    process.env.MISTRAL_API_KEY = "shared-mistral-key";
    const resolved = await resolveProviderKey(makeReq(), "mistral");
    expect(resolved.apiKey).toBe("shared-mistral-key");
    expect(resolved.usingSharedKey).toBe(true);
  });

  it("keeps Gemini's existing BYOK header (x-gemini-key) working unchanged", async () => {
    const resolved = await resolveProviderKey(makeReq({ "x-gemini-key": "user-own-key" }), "gemini");
    expect(resolved.apiKey).toBe("user-own-key");
    expect(resolved.usingSharedKey).toBe(false);
  });

  it("resolveGeminiKey (used by every other Gemini-only Meson route) still works as a thin alias", async () => {
    process.env.GEMINI_API_KEY_SHARED = "shared-gemini-key";
    const resolved = await resolveGeminiKey(makeReq());
    expect(resolved.apiKey).toBe("shared-gemini-key");
  });

  it("a missing Mistral key never blocks Gemini from resolving", async () => {
    delete process.env.MISTRAL_API_KEY;
    process.env.GEMINI_API_KEY_SHARED = "shared-gemini-key";
    await expect(resolveProviderKey(makeReq(), "mistral")).rejects.toBeInstanceOf(MesonKeyError);
    const gemini = await resolveProviderKey(makeReq(), "gemini");
    expect(gemini.apiKey).toBe("shared-gemini-key");
  });
});
