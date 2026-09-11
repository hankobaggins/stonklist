import { env } from "@/lib/env";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function verifyCron(req: Request): boolean {
  if (!env.cronSecret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${env.cronSecret}`;
}
