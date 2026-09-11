import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron";
import { env, hasSupabase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HeliusWebhookSchema, extractInbound, getTreasuryBalances } from "@/lib/helius";
import { ingestTransfers } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Hourly safety net:
 * 1) re-process any raw_webhooks that errored,
 * 2) DAS full-balance resync — DAS wins, deltas logged in `reconciliations`.
 */
export async function GET(req: Request) {
  if (!verifyCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSupabase || !env.treasuryWallet || !env.heliusApiKey) return NextResponse.json({ ok: true, skipped: "not configured" });
  const db = supabaseAdmin();

  // 1) replay failed webhooks
  const { data: failed } = await db.from("raw_webhooks").select("id,payload").eq("processed", false).not("error", "is", null).limit(50);
  let replayed = 0;
  for (const w of failed ?? []) {
    const parsed = HeliusWebhookSchema.safeParse(w.payload);
    if (!parsed.success) { await db.from("raw_webhooks").update({ processed: true }).eq("id", w.id); continue; }
    try {
      await ingestTransfers(extractInbound(parsed.data, env.treasuryWallet));
      await db.from("raw_webhooks").update({ processed: true, error: null }).eq("id", w.id);
      replayed++;
    } catch (e) {
      await db.from("raw_webhooks").update({ error: String(e) }).eq("id", w.id);
    }
  }

  // 2) DAS resync
  const das = await getTreasuryBalances(env.treasuryWallet);
  const { data: listings } = await db.from("listings").select("mint,balance");
  let fixed = 0;
  for (const l of listings ?? []) {
    const chain = das.find((d) => d.mint === l.mint)?.balance ?? 0;
    const ledger = Number(l.balance);
    const delta = chain - ledger;
    if (Math.abs(delta) > 1e-9) {
      await db.from("reconciliations").insert({ mint: l.mint, das_balance: chain, ledger_balance: ledger, delta });
      await db.from("listings").update({ balance: chain, updated_at: new Date().toISOString() }).eq("mint", l.mint);
      fixed++;
    }
  }
  return NextResponse.json({ ok: true, replayed, fixed, chainAssets: das.length });
}
