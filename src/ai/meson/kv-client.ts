import { Redis } from "@upstash/redis";

/**
 * Vercel KV (the native product) was sunset — Vercel now points everyone to
 * the Upstash Marketplace integration instead. Connecting that integration
 * to this project injects KV_REST_API_URL / KV_REST_API_TOKEN into the
 * environment (same variable names the old Vercel KV used, just backed by
 * Upstash now), so this client reads those directly rather than the
 * @upstash/redis defaults (UPSTASH_REDIS_REST_URL/TOKEN), which the
 * Marketplace integration does not set.
 */
export const kv = new Redis({
  url: process.env.KV_REST_API_URL ?? "",
  token: process.env.KV_REST_API_TOKEN ?? "",
});
