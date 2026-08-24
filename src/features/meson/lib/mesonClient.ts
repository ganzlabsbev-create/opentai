import { AppError } from "@/types/errors";

/**
 * POSTs JSON to a /api/meson/* route, attaching the user's own Gemini key
 * (if they've connected one under the "meson" provider in Settings) as
 * `x-gemini-key` so BYOK requests skip the shared-key rate limit — same
 * header contract as `ai/providers/meson.ts`'s chat provider.
 *
 * All /api/meson/* routes reply with `{ error: string }` + a status code on
 * failure (see `ai/meson/key-resolution.ts#mesonErrorResponse`), including
 * a ready-to-show Thai message for 429 (shared-key quota exceeded). That
 * message is surfaced as-is via AppError so callers don't need their own
 * 429 copy.
 */
export async function mesonPostJson<T>(path: string, body: unknown, apiKey?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey && apiKey.trim()) headers["x-gemini-key"] = apiKey.trim();

  let response: Response;
  try {
    response = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  } catch (err) {
    throw new AppError("OFFLINE", undefined, err);
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message: string | undefined = data?.error;
    if (response.status === 429) throw new AppError("RATE_LIMITED", message);
    if (response.status === 404) throw new AppError("MODEL_UNAVAILABLE", message);
    if (response.status === 400 || response.status === 503) throw new AppError("INVALID_API_KEY", message);
    throw new AppError("PROVIDER_UNAVAILABLE", message);
  }

  return response.json() as Promise<T>;
}

export async function mesonGetJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch (err) {
    throw new AppError("OFFLINE", undefined, err);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new AppError("PROVIDER_UNAVAILABLE", data?.error);
  }
  return response.json() as Promise<T>;
}

/** Strips the `data:...;base64,` prefix a `FileReader.readAsDataURL` result carries, if present. */
export function stripDataUrlPrefix(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i === -1 ? dataUrl : dataUrl.slice(i + 1);
}

export function readFileAsBase64(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ mimeType: file.type || "application/octet-stream", base64: stripDataUrlPrefix(String(reader.result)) });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
