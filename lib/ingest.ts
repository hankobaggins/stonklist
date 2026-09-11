import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { absoluteAsset, getToken, getPairs } from "@/lib/stonkfun";
import { attributeDividend } from "@/lib/scoring";
import { heliusRpcUrl, type InboundTransfer } from "@/lib/helius";
import { env } from "@/lib/env";

/**
 * Turn inbound treasury transfers into deposits / dividend events / ignored rows.
 * Idempotent: unique constraints make replays no-ops. CLAUDE.md §6.2, §7.
 */

interface ListingLite {
  mint: string; symbol: string; quote_mint: string | null; transfer_fee_bps: number | null;
  balance: number; mode: "standard" | "reward"; price_usd: number | null;
}

async function loadListings(): Promise<ListingLite[]> {
  const { data } = await supabaseAdmin().from("listings").select("mint,symbol,quote_mint,transfer_fee_bps,balance,mode,price_usd");
  return (data ?? []).map((l) => ({ ...l, balance: Number(l.balance), price_usd: l.price_usd == null ? null : Number(l.price_usd) }));
}

/** USD price of an arbitrary mint: Helius DAS price_info, falling back to StonkFun if it's a StonkFun token. */
export async function getMintPriceUsd(mint: string): Promise<number | null> {
  if (env.heliusApiKey) {
    try {
      const res = await fetch(heliusRpcUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "p", method: "getAsset", params: { id: mint } }),
        cache: "no-store",
      });
      const j = (await res.json()) as { result?: { token_info?: { price_info?: { price_per_token?: number } } } };
      const p = j.result?.token_info?.price_info?.price_per_token;
      if (typeof p === "number" && p > 0) return p;
    } catch {}
  }
  const t = await getToken(mint).catch(() => null);
  return t?.market.priceUsd ?? null;
}

export interface IngestSummary { deposits: number; dividends: number; autoListed: number; ignored: number }

export async function ingestTransfers(transfers: InboundTransfer[]): Promise<IngestSummary> {
  const db = supabaseAdmin();
  const summary: IngestSummary = { deposits: 0, dividends: 0, autoListed: 0, ignored: 0 };
  if (transfers.length === 0) return summary;
  let listings = await loadListings();
  const priceCache = new Map<string, number | null>();
  const priceOf = async (m: string) => {
    if (!priceCache.has(m)) priceCache.set(m, await getMintPriceUsd(m));
    return priceCache.get(m) ?? null;
  };

  for (const t of transfers) {
    const listed = listings.find((l) => l.mint === t.mint);

    // 1) Deposit of a listed token
    if (listed) {
      const price = listed.price_usd ?? (await priceOf(t.mint));
      const { error } = await db.from("deposits").insert({
        signature: t.signature, mint: t.mint, from_wallet: t.fromWallet, amount: t.amount,
        usd_at_deposit: price == null ? null : t.amount * price, slot: t.slot, block_time: t.blockTime, source: "webhook",
      });
      if (!error) {
        summary.deposits++;
        listed.balance += t.amount;
        await db.from("activity").insert({ kind: "deposit", mint: t.mint, wallet: t.fromWallet, amount: t.amount, usd: price == null ? null : t.amount * price, created_at: t.blockTime ?? new Date().toISOString() });
      }
      continue;
    }

    // 2) Dividend: quote asset of a reward-mode listing
    const quoteHolders = listings.filter((l) => l.quote_mint === t.mint && l.mode === "reward");
    if (quoteHolders.length > 0) {
      const price = await priceOf(t.mint);
      const usd = price == null ? null : t.amount * price;
      const parts = attributeDividend(t.mint, quoteHolders);
      for (const p of parts) {
        const { error } = await db.from("dividend_events").insert({
          signature: t.signature, quote_mint: t.mint, from_wallet: t.fromWallet,
          amount: t.amount * p.share, usd_at_receipt: usd == null ? null : usd * p.share,
          attributed_mint: p.mint, attribution: p.attribution, block_time: t.blockTime,
        });
        if (!error && p.mint) {
          summary.dividends++;
          const l = listings.find((x) => x.mint === p.mint)!;
          await db.from("activity").insert({ kind: "dividend", mint: p.mint, wallet: t.fromWallet, amount: t.amount * p.share, usd: usd == null ? null : usd * p.share, created_at: t.blockTime ?? new Date().toISOString() });
          void l;
        }
      }
      continue;
    }

    // 3) Unknown mint: auto-list if it's a StonkFun token, else ignore.
    const token = await getToken(t.mint).catch(() => null);
    if (token) {
      const pairs = await getPairs().catch(() => []);
      const decimals = pairs.find((p) => p.mint === token.quote.mint)?.decimals ?? null;
      const { error } = await db.from("listings").insert({
        mint: token.mint, pool: token.pool ?? null, name: token.name, symbol: token.symbol, image_url: absoluteAsset(token.imageUrl),
        quote_mint: token.quote.mint, quote_symbol: token.quote.symbol, quote_category: token.quote.category, quote_label: token.quote.categoryLabel, quote_decimals: decimals,
        mode: token.mode, transfer_fee_bps: token.transferFee?.bps ?? null, status: token.status, graduated_at: token.graduatedAt ?? null, created_on_stonkfun: token.createdAt ?? null,
        creator_wallet: token.creator ?? null, owner_wallet: null, site_url: token.links?.website ?? null, category: token.quote.category,
        price_usd: token.market.priceUsd ?? null, price_change_24h: token.market.priceChange24h ?? null, market_cap_usd: token.market.marketCapUsd ?? null,
      });
      if (!error) {
        summary.autoListed++;
        await db.from("activity").insert({ kind: "listed", mint: token.mint, wallet: t.fromWallet });
        listings = await loadListings();
        const price = token.market.priceUsd ?? null;
        const { error: dErr } = await db.from("deposits").insert({
          signature: t.signature, mint: t.mint, from_wallet: t.fromWallet, amount: t.amount,
          usd_at_deposit: price == null ? null : t.amount * price, slot: t.slot, block_time: t.blockTime, source: "webhook",
        });
        if (!dErr) {
          summary.deposits++;
          await db.from("activity").insert({ kind: "deposit", mint: t.mint, wallet: t.fromWallet, amount: t.amount, usd: price == null ? null : t.amount * price, created_at: t.blockTime ?? new Date().toISOString() });
        }
      }
      continue;
    }

    await db.from("ignored_transfers").upsert(
      { signature: t.signature, mint: t.mint, from_wallet: t.fromWallet, amount: t.amount, reason: "not a StonkFun token or quote asset" },
      { onConflict: "signature,mint", ignoreDuplicates: true },
    );
    summary.ignored++;
  }
  return summary;
}
