import { NextRequest, NextResponse } from "next/server";
import { getAllMesonEntries } from "@/ai/meson/registry";
import { resolveLiveStatuses } from "@/ai/meson/availability";
import type { MesonModelInfo } from "@/ai/meson/types";

export const runtime = "nodejs";

/**
 * Public model list — this is what the chat UI's model picker calls.
 * By default the real Gemini model id is NOT included (users see Meson
 * names only). Pass ?reveal=1 to include providerModelId, used by the
 * small "รุ่นจริง: gemini-x" caption in the UI and by the admin status page.
 * Unavailable models are still returned (so an admin/dev can see them) but
 * the client-side picker filters status === "unavailable" out for normal
 * users.
 */
export async function GET(req: NextRequest) {
  const reveal = req.nextUrl.searchParams.get("reveal") === "1";
  const entries = getAllMesonEntries();

  const key = process.env.GEMINI_API_KEY_SHARED;
  const statuses = key
    ? await resolveLiveStatuses(entries, key)
    : new Map(entries.map((e) => [e.mesonId, e.declaredStability] as const));

  const models: MesonModelInfo[] = entries.map((e) => ({
    mesonId: e.mesonId,
    mesonName: e.mesonName,
    category: e.category,
    providerId: e.providerId,
    declaredStability: e.declaredStability,
    blurb: e.blurb,
    status: statuses.get(e.mesonId) ?? "unknown",
    ...(reveal ? { providerModelId: e.providerModelId } : {}),
  }));

  return NextResponse.json({ models });
}
