import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron";
import { hasSupabase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRewards } from "@/lib/stonkfun";
import { getMintPriceUsd } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Every 15 min:
 * - back-fill usd_at_receipt for dividend events that arrived without a price,
 * - refresh the StonkFun /rewards cross-reference (lifetime payouts per coin) into listings metadata.
 */
export async function GET(req: Request) {
  if (!verifyCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSupabase) return NextResponse.json({ ok: true, skipped: "no supabase" });
  const db = supabaseAdmin();

  // Back-fill missing prices (trigger only fires on insert, so bump listings manually here).
  const { data: missing } = await db.from("dividend_events").select("id,quote_mint,amount,attributed_mint").is("usd_at_receipt", null).limit(100);
  let filled = 0;
  const cache = new Map<string, number | null>();
  for (const ev of missing ?? []) {
    if (!cache.has(ev.quote_mint)) cache.set(ev.quote_mint, await getMintPriceUsd(ev.quote_mint));
    const p = cache.get(ev.quote_mint);
    if (p == null) continue;
    const usd = Number(ev.amount) * p;
    const { error } = await db.from("dividend_events").update({ usd_at_receipt: usd }).eq("id", ev.id);
    if (!error && ev.attributed_mint) {
      await db.rpc("bump_dividends_usd", { p_mint: ev.attributed_mint, p_usd: usd }).then(() => undefined, () => undefined);
      filled++;
    }
  }

  // /rewards cross-reference
  let rewards = 0;
  try {
    const launches = await getRewards();
    const { data: listed } = await db.from("listings").select("mint").eq("mode", "reward");
    const set = new Set((listed ?? []).map((l) => l.mint));
    for (const r of launches) {
      if (!set.has(r.mint)) continue;
      await db.from("reward_stats").upsert({
        mint: r.mint, quote_symbol: r.quote.symbol, distributed_tokens: r.distributedTokens ?? null,
        payout_count: r.payoutCount ?? null, holder_count: r.holderCount ?? null, last_payout_at: r.lastPayoutAt ?? null, updated_at: new Date().toISOString(),
      });
      rewards++;
    }
  } catch {}

  return NextResponse.json({ ok: true, filled, rewards });
}
