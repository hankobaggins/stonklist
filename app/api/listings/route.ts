import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { absoluteAsset, getToken, getPairs } from "@/lib/stonkfun";
import { SIGN_MAX_AGE_MS, isValidPubkey, listingMessage, verifySignature } from "@/lib/sign";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({
  mint: z.string().refine(isValidPubkey, "bad mint"),
  ts: z.number().int(),
  wallet: z.string().refine(isValidPubkey, "bad wallet"),
  signature: z.string().min(80).max(100),
  siteUrl: z.url().max(200).nullable().optional(),
  tagline: z.string().max(140).nullable().optional(),
});

/** POST register (or update, if owner) a listing. Requires a signed message. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!rateLimit(`listings:${ip}`, 10, 60_000)) return NextResponse.json({ error: "slow down" }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad request" }, { status: 400 });
  const { mint, ts, wallet, signature, siteUrl, tagline } = parsed.data;

  if (Math.abs(Date.now() - ts) > SIGN_MAX_AGE_MS) return NextResponse.json({ error: "signature expired, try again" }, { status: 400 });
  if (!verifySignature(listingMessage(mint, ts), signature, wallet)) return NextResponse.json({ error: "signature doesn't verify" }, { status: 401 });

  const t = await getToken(mint).catch(() => undefined);
  if (t === undefined) return NextResponse.json({ error: "StonkFun API unreachable" }, { status: 502 });
  if (t === null) return NextResponse.json({ error: "not a StonkFun token" }, { status: 404 });

  if (!hasSupabase) return NextResponse.json({ ok: true, demo: true, mint });

  const db = supabaseAdmin();
  const pairs = await getPairs().catch(() => []);
  const decimals = pairs.find((p) => p.mint === t.quote.mint)?.decimals ?? null;

  const { data: existing } = await db.from("listings").select("owner_wallet").eq("mint", mint).maybeSingle();
  if (existing && existing.owner_wallet && existing.owner_wallet !== wallet) {
    return NextResponse.json({ error: "already registered by another wallet — you can still deposit" }, { status: 409 });
  }

  const row = {
    mint: t.mint,
    pool: t.pool ?? null,
    name: t.name,
    symbol: t.symbol,
    image_url: absoluteAsset(t.imageUrl),
    quote_mint: t.quote.mint,
    quote_symbol: t.quote.symbol,
    quote_category: t.quote.category,
    quote_label: t.quote.categoryLabel,
    quote_decimals: decimals,
    mode: t.mode,
    transfer_fee_bps: t.transferFee?.bps ?? null,
    status: t.status,
    graduated_at: t.graduatedAt ?? null,
    created_on_stonkfun: t.createdAt ?? null,
    creator_wallet: t.creator ?? null,
    owner_wallet: wallet,
    site_url: siteUrl ?? t.links?.website ?? null,
    tagline: tagline ?? null,
    category: t.quote.category,
    price_usd: t.market.priceUsd ?? null,
    price_change_24h: t.market.priceChange24h ?? null,
    market_cap_usd: t.market.marketCapUsd ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("listings").upsert(row, { onConflict: "mint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!existing) await db.from("activity").insert({ kind: "listed", mint, wallet });
  return NextResponse.json({ ok: true, mint });
}
