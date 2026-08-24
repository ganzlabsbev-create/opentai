import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/ai/meson/kv-client";
import { mesonErrorResponse, MesonKeyError, resolveGeminiKey } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface StoredJob {
  mesonId: string;
  operationName: string; // e.g. "operations/abc123"
  createdAt: number;
}

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const job = await kv.get<StoredJob>(`meson:video:job:${params.jobId}`);
  if (!job) return mesonErrorResponse(new MesonKeyError(404, "ไม่พบงานนี้ (อาจหมดอายุแล้ว)"));

  let resolved;
  try {
    resolved = await resolveGeminiKey(req);
  } catch (err) {
    return mesonErrorResponse(err);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${job.operationName}?key=${encodeURIComponent(
    resolved.apiKey
  )}`;

  const upstream = await fetch(url).catch(() => null);
  if (!upstream) return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, t || "เช็คสถานะงานไม่สำเร็จ"));
  }

  const data = (await upstream.json()) as {
    done?: boolean;
    error?: { message: string };
    response?: unknown;
  };

  if (data.error) {
    return NextResponse.json({ jobId: params.jobId, status: "failed", error: data.error.message });
  }
  if (!data.done) {
    return NextResponse.json({ jobId: params.jobId, status: "pending" });
  }

  await kv.del(`meson:video:job:${params.jobId}`);
  return NextResponse.json({ jobId: params.jobId, status: "done", result: data.response });
}
