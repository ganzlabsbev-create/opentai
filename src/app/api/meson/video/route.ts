import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { kv } from "@/ai/meson/kv-client";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveGeminiKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface VideoBody {
  mesonId: string;
  prompt: string;
}

const JOB_TTL_SECONDS = 60 * 60; // 1h — plenty for a video job to finish; avoids KV bloat if a client never polls to completion.

/**
 * Video generation is a long-running operation on Google's side: this route
 * only starts the job and hands back a jobId; /video/[jobId] polls it.
 * NOTE: the exact predictLongRunning request/response shape for
 * gemini-omni-flash is unconfirmed against current docs (model postdates
 * this assistant's training data) — verify before shipping.
 */
export async function POST(req: NextRequest) {
  let body: VideoBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (entry.category !== "video") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดลวิดีโอ`));
  }
  if (!body.prompt?.trim()) {
    return mesonErrorResponse(new MesonKeyError(400, "ต้องมี prompt"));
  }

  let resolved;
  try {
    resolved = await resolveGeminiKey(req);
  } catch (err) {
    return mesonErrorResponse(err);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    entry.providerModelId
  )}:predictLongRunning?key=${encodeURIComponent(resolved.apiKey)}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt: body.prompt }] }),
  }).catch(() => null);

  if (!upstream) return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, t || "เริ่มงานสร้างวิดีโอไม่สำเร็จ"));
  }

  const data = (await upstream.json()) as { name?: string };
  if (!data.name) return mesonErrorResponse(new MesonKeyError(502, "Gemini ไม่ส่ง operation กลับมา"));

  const jobId = randomUUID();
  await kv.set(
    `meson:video:job:${jobId}`,
    { mesonId: entry.mesonId, operationName: data.name, createdAt: Date.now() },
    { ex: JOB_TTL_SECONDS }
  );

  return NextResponse.json({ jobId, status: "pending" }, { status: 202 });
}
