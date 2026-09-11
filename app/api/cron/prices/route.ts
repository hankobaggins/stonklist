import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron";
import { hasSupabase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTokensPaced, absoluteAsset } from "@/lib/stonkfun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Every 5 min: refresh price/market data for all listed mints, write price_snapshots. */
export async function GET(req: Request) {
  if (!verifyCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasSupabase) return NextResponse.json({ ok: true, skipped: "no supabase" });
  const db = supabaseAdmin();
  const { data: rows } = await db.from("listings").select("mint,balance,dividends_usd");
  const mints = (rows ?? []).map((r) => r.mint);
  let updated = 0;
  const now = new Date().toISOString();
  await getTokensPaced(mints, async (mint, t) => {
    if (!t) return;
    const row = rows!.find((r) => r.mint === mint)!;
    const price = t.market.priceUsd ?? null;
    const { error } = await db
      .from("listings")
      .update({
        price_usd: price,
        price_change_24h: t.market.priceChange24h ?? null,
        market_cap_usd: t.market.marketCapUsd ?? null,
        status: t.status,
        graduated_at: t.graduatedAt ?? null,
        image_url: absoluteAsset(t.imageUrl),
        name: t.name,
        symbol: t.symbol,
        updated_at: now,
      })
      .eq("mint", mint);
    if (error) return;
    updated++;
    if (price != null) {
      await db.from("price_snapshots").insert({
        mint,
        price_usd: price,
        market_cap_usd: t.market.marketCapUsd ?? null,
        score_usd: Number(row.balance) * price + Number(row.dividends_usd),
        taken_at: now,
      });
    }
  });
  return NextResponse.json({ ok: true, updated, total: mints.length });
}
