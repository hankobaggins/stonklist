import "server-only";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { rank, todayScore } from "@/lib/scoring";
import {
  mockActivity,
  mockDeposits,
  mockDividends,
  mockListings,
  mockSnapshots,
} from "@/lib/mock";
import type {
  Activity,
  Deposit,
  DividendEvent,
  Listing,
  PriceSnapshot,
  RankedListing,
  TodayListing,
  TreasuryTotals,
} from "@/lib/types";

/**
 * Read layer for server components. When Supabase isn't configured we serve
 * mock data so the site renders everywhere (local dev, preview without keys).
 */

export const DATA_SOURCE: "supabase" | "mock" = hasSupabase ? "supabase" : "mock";

function num(v: unknown): number {
  return typeof v === "number" ? v : v == null ? 0 : Number(v);
}
function normalize(row: Record<string, unknown>): Listing {
  return {
    ...(row as unknown as Listing),
    balance: num(row.balance),
    price_usd: row.price_usd == null ? null : num(row.price_usd),
    price_change_24h: row.price_change_24h == null ? null : num(row.price_change_24h),
    market_cap_usd: row.market_cap_usd == null ? null : num(row.market_cap_usd),
    dividends_usd: num(row.dividends_usd),
    bag_usd: num(row.bag_usd),
    score_usd: num(row.score_usd),
    peak_score_usd: num(row.peak_score_usd),
    clicks: num(row.clicks),
  };
}

export async function getListings(): Promise<Listing[]> {
  if (!hasSupabase) return mockListings.filter((l) => !l.hidden);
  const { data, error } = await supabaseServer()
    .from("listings_public")
    .select("*")
    .order("score_usd", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

export async function getLeaderboard(): Promise<RankedListing[]> {
  const listings = await getListings();
  const ranked = rank(listings);
  const changes = await getScoreChanges24h(ranked.map((l) => l.mint));
  return ranked.map((l) => ({ ...l, score_change_24h_usd: changes.get(l.mint) ?? null }));
}

/** Score 24h ago per mint (from price_snapshots); mock derives from price change. */
async function getScoreChanges24h(mints: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!hasSupabase) {
    for (const l of mockListings) {
      const prev = l.balance * ((l.price_usd ?? 0) / (1 + (l.price_change_24h ?? 0) / 100));
      out.set(l.mint, l.score_usd - (prev + l.dividends_usd * 0.9));
    }
    return out;
  }
  if (mints.length === 0) return out;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabaseServer()
    .from("price_snapshots")
    .select("mint, score_usd, taken_at")
    .in("mint", mints)
    .gte("taken_at", since)
    .order("taken_at", { ascending: true });
  const first = new Map<string, number>();
  for (const r of data ?? []) if (!first.has(r.mint)) first.set(r.mint, num(r.score_usd));
  const listings = await getListings();
  for (const l of listings) {
    const f = first.get(l.mint);
    if (f !== undefined) out.set(l.mint, l.score_usd - f);
  }
  return out;
}

export async function getToday(limit = 10): Promise<TodayListing[]> {
  const listings = await getListings();
  const deposits = await getRecentDeposits(24);
  const dividends = await getRecentDividends(24);
  const rows = listings
    .map((l) => ({
      mint: l.mint,
      symbol: l.symbol,
      name: l.name,
      image_url: l.image_url,
      quote_label: l.quote_label,
      today_usd: todayScore({
        mint: l.mint,
        deposits: deposits.filter((d) => d.mint === l.mint),
        dividends: dividends.filter((d) => d.attributed_mint === l.mint),
      }),
    }))
    .filter((r) => r.today_usd > 0)
    .sort((a, b) => b.today_usd - a.today_usd)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return rows;
}

async function getRecentDeposits(hours: number): Promise<Deposit[]> {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  if (!hasSupabase) return mockDeposits.filter((d) => d.block_time && d.block_time >= since);
  const { data } = await supabaseServer().from("deposits").select("*").gte("block_time", since);
  return (data ?? []).map((d) => ({ ...d, amount: num(d.amount), usd_at_deposit: d.usd_at_deposit == null ? null : num(d.usd_at_deposit) }));
}
async function getRecentDividends(hours: number): Promise<DividendEvent[]> {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  if (!hasSupabase) return mockDividends.filter((d) => d.block_time && d.block_time >= since);
  const { data } = await supabaseServer().from("dividend_events").select("*").gte("block_time", since);
  return (data ?? []).map((d) => ({ ...d, amount: num(d.amount), usd_at_receipt: d.usd_at_receipt == null ? null : num(d.usd_at_receipt) }));
}

export async function getListing(mint: string): Promise<RankedListing | null> {
  const board = await getLeaderboard();
  return board.find((l) => l.mint === mint) ?? null;
}

export async function getDeposits(mint: string, limit = 50): Promise<Deposit[]> {
  if (!hasSupabase)
    return mockDeposits.filter((d) => d.mint === mint).sort((a, b) => Date.parse(b.block_time!) - Date.parse(a.block_time!)).slice(0, limit);
  const { data } = await supabaseServer()
    .from("deposits").select("*").eq("mint", mint).order("block_time", { ascending: false }).limit(limit);
  return (data ?? []).map((d) => ({ ...d, amount: num(d.amount), usd_at_deposit: d.usd_at_deposit == null ? null : num(d.usd_at_deposit) }));
}

export async function getDividendEvents(mint: string, limit = 50): Promise<DividendEvent[]> {
  if (!hasSupabase)
    return mockDividends.filter((d) => d.attributed_mint === mint).sort((a, b) => Date.parse(b.block_time!) - Date.parse(a.block_time!)).slice(0, limit);
  const { data } = await supabaseServer()
    .from("dividend_events").select("*").eq("attributed_mint", mint).order("block_time", { ascending: false }).limit(limit);
  return (data ?? []).map((d) => ({ ...d, amount: num(d.amount), usd_at_receipt: d.usd_at_receipt == null ? null : num(d.usd_at_receipt) }));
}

export async function getSnapshots(mint: string, hours = 48): Promise<PriceSnapshot[]> {
  if (!hasSupabase) return mockSnapshots(mint);
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data } = await supabaseServer()
    .from("price_snapshots").select("*").eq("mint", mint).gte("taken_at", since).order("taken_at", { ascending: true });
  return (data ?? []).map((s) => ({ ...s, price_usd: num(s.price_usd), score_usd: num(s.score_usd), market_cap_usd: s.market_cap_usd == null ? null : num(s.market_cap_usd) }));
}

export async function getActivity(limit = 20): Promise<Activity[]> {
  if (!hasSupabase) return mockActivity.slice(0, limit);
  const { data } = await supabaseServer()
    .from("activity_public").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map((a) => ({ ...a, amount: a.amount == null ? null : num(a.amount), usd: a.usd == null ? null : num(a.usd) }));
}

export async function getTotals(): Promise<TreasuryTotals> {
  const listings = await getListings();
  let deposits = 0;
  if (!hasSupabase) deposits = mockDeposits.length;
  else {
    const { count } = await supabaseServer().from("deposits").select("id", { count: "exact", head: true });
    deposits = count ?? 0;
  }
  return {
    listings: listings.length,
    deposits,
    bag_usd: listings.reduce((a, l) => a + l.bag_usd, 0),
    dividends_usd: listings.reduce((a, l) => a + l.dividends_usd, 0),
    score_usd: listings.reduce((a, l) => a + l.score_usd, 0),
  };
}

export async function getCategories(): Promise<{ key: string; label: string; count: number }[]> {
  const listings = await getListings();
  const m = new Map<string, { label: string; count: number }>();
  for (const l of listings) {
    const k = l.quote_category ?? "custom";
    const cur = m.get(k) ?? { label: l.quote_label ?? "Custom", count: 0 };
    cur.count++;
    m.set(k, cur);
  }
  return [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count);
}
