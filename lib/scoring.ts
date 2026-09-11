import Decimal from "decimal.js";

/**
 * Pure scoring functions (CLAUDE.md §7). All inputs are plain numbers or strings;
 * math runs through decimal.js so cents never drift.
 */

export type Numeric = number | string | Decimal;
const D = (v: Numeric | null | undefined) => new Decimal(v ?? 0);

/** bag = balance × price (mark-to-market). */
export function bagUsd(balance: Numeric, priceUsd: Numeric | null | undefined): number {
  return D(balance).mul(D(priceUsd)).toDecimalPlaces(6).toNumber();
}

/** score = bag + dividends (dividends frozen at receipt, never re-marked). */
export function score(
  balance: Numeric,
  priceUsd: Numeric | null | undefined,
  dividendsUsd: Numeric,
): number {
  return D(bagUsd(balance, priceUsd)).add(D(dividendsUsd)).toDecimalPlaces(6).toNumber();
}

/** Claim price: what it costs (USD) to overtake #1 from a given score, +1 % buffer. */
export function claimPrice(topScore: Numeric, myScore: Numeric = 0): number {
  const gap = Decimal.max(0, D(topScore).sub(D(myScore)));
  return gap.mul(1.01).toDecimalPlaces(2).toNumber();
}

export interface Rankable {
  mint: string;
  score_usd: number;
  first_deposit_at: string | null;
}

/** Sort by score desc, ties by earliest first_deposit_at, then mint for determinism. */
export function rank<T extends Rankable>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.score_usd !== a.score_usd) return b.score_usd - a.score_usd;
    const ta = a.first_deposit_at ? Date.parse(a.first_deposit_at) : Infinity;
    const tb = b.first_deposit_at ? Date.parse(b.first_deposit_at) : Infinity;
    if (ta !== tb) return ta - tb;
    return a.mint < b.mint ? -1 : 1;
  });
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

export interface TodayInput {
  mint: string;
  deposits: { usd_at_deposit: number | null; block_time: string | null }[];
  dividends: { usd_at_receipt: number | null; block_time: string | null }[];
}

/** Trailing-24h USD inflow (deposits at deposit-time USD + dividends at receipt USD). */
export function todayScore(input: TodayInput, now: Date = new Date()): number {
  const cutoff = now.getTime() - 24 * 3600 * 1000;
  const inWindow = (t: string | null) => t !== null && Date.parse(t) >= cutoff;
  let total = new Decimal(0);
  for (const d of input.deposits) if (inWindow(d.block_time)) total = total.add(D(d.usd_at_deposit));
  for (const d of input.dividends) if (inWindow(d.block_time)) total = total.add(D(d.usd_at_receipt));
  return total.toDecimalPlaces(6).toNumber();
}

/**
 * Attribute an inbound quote-asset transfer to listings. Exact when only one
 * listing uses that quote; otherwise split pro-rata by transferFee.bps × balance.
 */
export interface AttributionCandidate {
  mint: string;
  quote_mint: string | null;
  transfer_fee_bps: number | null;
  balance: number;
  mode: "standard" | "reward";
}
export interface AttributionResult {
  mint: string | null;
  share: number; // 0..1
  attribution: "exact" | "estimated" | "unattributed";
}
export function attributeDividend(
  quoteMint: string,
  candidates: AttributionCandidate[],
): AttributionResult[] {
  const eligible = candidates.filter(
    (c) => c.quote_mint === quoteMint && c.mode === "reward" && c.balance > 0,
  );
  if (eligible.length === 0) return [{ mint: null, share: 1, attribution: "unattributed" }];
  if (eligible.length === 1) return [{ mint: eligible[0].mint, share: 1, attribution: "exact" }];
  const weights = eligible.map((c) => D(c.transfer_fee_bps ?? 0).mul(D(c.balance)));
  const total = weights.reduce((a, b) => a.add(b), new Decimal(0));
  if (total.isZero()) {
    const even = 1 / eligible.length;
    return eligible.map((c) => ({ mint: c.mint, share: even, attribution: "estimated" }));
  }
  return eligible.map((c, i) => ({
    mint: c.mint,
    share: weights[i].div(total).toNumber(),
    attribution: "estimated",
  }));
}

/** Convert a raw on-chain amount to token units. */
export function fromRaw(raw: Numeric, decimals: number): number {
  return D(raw).div(new Decimal(10).pow(decimals)).toNumber();
}
