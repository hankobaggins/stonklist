import { NextResponse } from "next/server";
import { HeliusWebhookSchema, extractInbound, verifyWebhookAuth } from "@/lib/helius";
import { env, hasSupabase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ingestTransfers } from "@/lib/ingest";
import { checkCrown } from "@/lib/crown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Helius Enhanced Webhook receiver. verify → parse → idempotent write → 200. */
export async function POST(req: Request) {
  if (!verifyWebhookAuth(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSupabase || !env.treasuryWallet) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw: unknown = await req.json().catch(() => null);
  const db = supabaseAdmin();
  const { data: logged } = await db.from("raw_webhooks").insert({ payload: raw ?? {} }).select("id").single();

  const parsed = HeliusWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    await db.from("raw_webhooks").update({ error: "schema", processed: true }).eq("id", logged?.id ?? -1);
    return NextResponse.json({ ok: false, error: "bad payload" }, { status: 200 }); // 200 so Helius doesn't retry forever
  }

  try {
    const inbound = extractInbound(parsed.data, env.treasuryWallet);
    const summary = await ingestTransfers(inbound);
    await db.from("raw_webhooks").update({ processed: true }).eq("id", logged?.id ?? -1);
    // a deposit can flip #1 — check now rather than waiting for the next price tick
    const crown = summary.deposits + summary.dividends > 0 ? await checkCrown().catch((e) => ({ ok: false, error: String(e) })) : null;
    return NextResponse.json({ ok: true, ...summary, crown });
  } catch (e) {
    await db.from("raw_webhooks").update({ error: String(e) }).eq("id", logged?.id ?? -1);
    return NextResponse.json({ ok: false }, { status: 200 }); // reconcile cron picks it up
  }
}
