export type Mode = "standard" | "reward";
export type TokenStatus = "new" | "aboutToGraduate" | "graduated";
export type Attribution = "exact" | "estimated" | "unattributed";

/** One row of `listings` (Supabase) — also the shape used by mock data. */
export interface Listing {
  mint: string;
  pool: string | null;
  name: string;
  symbol: string;
  image_url: string | null;
  quote_mint: string | null;
  quote_symbol: string | null;
  quote_category: string | null;
  quote_label: string | null;
  quote_decimals: number | null;
  mode: Mode;
  transfer_fee_bps: number | null;
  status: TokenStatus | null;
  graduated_at: string | null;
  created_on_stonkfun: string | null;
  creator_wallet: string | null;
  owner_wallet: string | null;
  site_url: string | null;
  tagline: string | null;
  category: string | null;
  balance: number;
  price_usd: number | null;
  price_change_24h: number | null;
  market_cap_usd: number | null;
  dividends_usd: number;
  bag_usd: number;
  score_usd: number;
  peak_score_usd: number;
  first_deposit_at: string | null;
  last_deposit_at: string | null;
  clicks: number;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface RankedListing extends Listing {
  rank: number;
  /** USD score change over trailing 24h (from price_snapshots), null if unknown. */
  score_change_24h_usd: number | null;
}

export interface TodayListing {
  mint: string;
  symbol: string;
  name: string;
  image_url: string | null;
  quote_label: string | null;
  today_usd: number;
  rank: number;
}

export interface Deposit {
  id: number;
  signature: string;
  mint: string;
  from_wallet: string;
  amount: number;
  usd_at_deposit: number | null;
  slot: number | null;
  block_time: string | null;
  source: string;
}

export interface DividendEvent {
  id: number;
  signature: string;
  quote_mint: string;
  from_wallet: string | null;
  amount: number;
  usd_at_receipt: number | null;
  attributed_mint: string | null;
  attribution: Attribution;
  block_time: string | null;
}

export interface PriceSnapshot {
  mint: string;
  price_usd: number;
  market_cap_usd: number | null;
  score_usd: number;
  taken_at: string;
}

export type ActivityKind = "deposit" | "dividend" | "listed";

export interface Activity {
  id: number;
  kind: ActivityKind;
  mint: string;
  wallet: string | null;
  amount: number | null;
  usd: number | null;
  created_at: string;
  // joined for display
  symbol?: string;
  image_url?: string | null;
  quote_symbol?: string | null;
}

export interface TreasuryTotals {
  listings: number;
  deposits: number;
  bag_usd: number;
  dividends_usd: number;
  score_usd: number;
}

export interface QuotePair {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
  category: string;
  categoryLabel: string;
}
