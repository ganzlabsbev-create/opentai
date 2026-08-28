import { NextRequest } from "next/server";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveProviderKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";
import { CHAT_PROXIES } from "@/ai/meson/providers";
import { TEMPORARILY_DISABLED_MESON_IDS } from "@/ai/meson/registry.config";

export const runtime = "nodejs";

interface ChatBody {
  mesonId: string;
  messages: { role: "user" | "assistant"; content: string; images?: { mimeType: string; base64: string }[] }[];
  context?: string;
}

/**
 * Resolves a Meson chat/pro entry to its real backend (Gemini or Mistral —
 * see ai/meson/providers) and re-streams the response as SSE. Every
 * backend's proxy returns the same Gemini-shaped chunk format
 * (`candidates[0].content.parts[].text`), so the client-side parser in
 * ai/providers/meson.ts didn't need to change when Mistral was added here —
 * only this route + the per-provider proxies did.
 */
export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (TEMPORARILY_DISABLED_MESON_IDS.has(entry.mesonId)) {
    return mesonErrorResponse(new MesonKeyError(503, `${entry.mesonName} ปิดใช้งานชั่วคราว กรุณาเลือกโมเดลอื่น`));
  }
  if (entry.category !== "chat" && entry.category !== "pro") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดลแชท ใช้ route นี้ไม่ได้`));
  }

  // Belt-and-suspenders: the composer already hides/warns on the image
  // button for a non-vision model, but never trust the client alone — a
  // request with image data against a model that can't read images is
  // rejected here too, with a message the UI can show as-is.
  const hasImages = (body.messages ?? []).some((m) => m.images && m.images.length > 0);
  if (hasImages && !entry.supportsVision) {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่รองรับการดูรูปภาพ กรุณาเลือกโมเดลอื่น`));
  }

  const proxy = CHAT_PROXIES[entry.providerId];
  if (!proxy) {
    // Defensive only — registry.ts + the MesonProviderId union already make
    // this unreachable for a valid config, but a route must never crash.
    return mesonErrorResponse(new MesonKeyError(500, `ไม่มี chat proxy สำหรับผู้ให้บริการ "${entry.providerId}"`));
  }

  let resolved;
  try {
    resolved = await resolveProviderKey(req, entry.providerId, { deferQuotaCommit: true });
  } catch (err) {
    return mesonErrorResponse(err);
  }

  try {
    const response = await proxy({
      entry,
      apiKey: resolved.apiKey,
      messages: body.messages ?? [],
      context: body.context,
      signal: req.signal,
    });
    // Only counts against the shared-key quota once the provider actually
    // accepted the request and started answering — a timeout or upstream
    // error above never reaches this line, so it never costs the user a use.
    await resolved.commitSharedKeyUsage();
    response.headers.set("X-Meson-Used-Shared-Key", String(resolved.usingSharedKey));
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return mesonErrorResponse(err);
  }
}
