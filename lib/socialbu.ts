import { env } from "@/lib/env";

/**
 * Minimal SocialBu API v1 client (https://socialbu.com/developers/docs).
 * Bearer token from Settings → API for Developers. Server-only.
 */
const BASE = "https://socialbu.com/api/v1";

export const hasSocialBu = Boolean(env.socialbuToken && env.socialbuAccountId);

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.socialbuToken}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`socialbu ${path} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

/** Server-side fetch of an HTTP(S) image → upload_token for existing_attachments. */
export async function uploadMediaByUrl(url: string, name: string): Promise<string> {
  const r = await call<{ upload_token?: string }>("/upload_media_by_url", { url, name });
  if (!r.upload_token) throw new Error("socialbu upload: no upload_token in response");
  return r.upload_token;
}

/** Y-m-d H:i:s in UTC, as SocialBu wants it. */
function utcStamp(d = new Date()): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export interface PublishResult { postId: string | null; raw: unknown }

/** Create a post on the configured account and push it out immediately. */
export async function publishNow(content: string, uploadTokens: string[] = []): Promise<PublishResult> {
  const created = await call<{ success?: boolean; posts?: { id?: number | string }[] }>("/posts", {
    accounts: [env.socialbuAccountId],
    publish_at: utcStamp(),
    content,
    existing_attachments: uploadTokens.map((upload_token) => ({ upload_token })),
  });
  const id = created.posts?.[0]?.id;
  const postId = id == null ? null : String(id);
  if (postId) {
    // publish_at = now already schedules it for the next tick; this makes it immediate.
    try { await call(`/posts/${postId}/publish`, {}); } catch { /* scheduled anyway */ }
  }
  return { postId, raw: created };
}
