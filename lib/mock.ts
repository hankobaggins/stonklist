import type {
  Activity,
  Deposit,
  DividendEvent,
  Listing,
  PriceSnapshot,
} from "@/lib/types";

/**
 * Mock data used when Supabase env is not configured (local dev / previews).
 * Mints, symbols, quotes, prices and images are REAL StonkFun tokens snapshotted
 * 2026-09-11; balances, deposits and dividends are invented.
 */
const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

interface Seed {
  mint: string; symbol: string; name: string; image: string; pool: string;
  qMint: string; qSymbol: string; qCat: string; qLabel: string; qDec: number;
  mode: "standard" | "reward"; bps: number; price: number; mcap: number; chg: number;
  created: string; graduated: string; site?: string; tw?: string;
  balance: number; divs: number; tagline: string; firstDep: number; clicks: number;
}

const seeds: Seed[] = [
  { mint: "8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS", symbol: "KNOTS", name: "KNOTS", image: "https://gateway.irys.xyz/3KNgu99JvZ961wXUxcZ8LXDXjaWK4651Wo9oUZSA5U4L", pool: "GeNDy5afAWz7S9w2tMLgpK3xQqXjeDaCvYV9h8joEmjo", qMint: "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx", qSymbol: "STONK", qCat: "custom", qLabel: "Custom", qDec: 6, mode: "reward", bps: 300, price: 0.04237235606898181, mcap: 42372356, chg: 54.75, created: "2026-09-05T16:34:45.099Z", graduated: "2026-09-06T14:47:58.750Z", site: "https://www.stonkfun.xyz/", tw: "https://x.com/KnotsOnStonk", balance: 410_000, divs: 1_284.5, tagline: "tie yourself to the stonk. 3% tax, paid in $STONK.", firstDep: 96, clicks: 12_811 },
  { mint: "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx", symbol: "STONK", name: "STONK", image: "https://www.stonkfun.xyz/api/asset/quote-logo/6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx?v=c3c81410", pool: "7a8xxAJBELDo6P9dikSYctdw6ce8F4mWr3ahcAD8Ao49", qMint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", qSymbol: "SPYX", qCat: "xstock", qLabel: "xStock", qDec: 8, mode: "standard", bps: 0, price: 0.3168789234575004, mcap: 270604190, chg: 46.89, created: "2026-07-23T19:08:03.348Z", graduated: "2026-07-23T19:24:05.347Z", balance: 48_000, divs: 0, tagline: "the OG. paired with the S&P 500.", firstDep: 140, clicks: 22_686 },
  { mint: "HcRLc9VDgjLeK154xDawfb1dmVJ98DoSqcwTHGqiDeJR", symbol: "ZCAT", name: "Anonymous Cat", image: "https://gateway.irys.xyz/7uFsXwyuyzKDiqdda4L2cq3DcpcdRqYhwe4m8ZoVJ1BQ", pool: "BTccxxTFi7a9xJTE1exKn38Jgie35s6gNeRxd8DM61Rc", qMint: "A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS", qSymbol: "ZEC", qCat: "custom", qLabel: "Custom", qDec: 8, mode: "reward", bps: 300, price: 0.08248252900236513, mcap: 79910828, chg: -14.21, created: "2026-08-30T23:30:26.185Z", graduated: "2026-08-30T23:59:36.276Z", balance: 120_000, divs: 2_930.1, tagline: "shielded cat. dividends in ZEC.", firstDep: 200, clicks: 9_402 },
  { mint: "FjTfaSH861nVcbAxdFAHTvhoSL4kyR6wgTWynuJkapht", symbol: "DIVI", name: "DividendCoin", image: "https://gateway.irys.xyz/FT9XVQdFwpkKMfEvi2rEKwEP7mNbXgtXvNUk2B3dWA9v", pool: "A86XgwL7tAp9v9YHBkx3ytDmtREFRar9rxhd92kdg5N1", qMint: "Xs78JED6PFZxWc2wCEPspZW9kL3Se5J7L5TChKgsidH", qSymbol: "STRCX", qCat: "xstock", qLabel: "xStock", qDec: 8, mode: "reward", bps: 300, price: 0.004649671352269607, mcap: 4649671, chg: 0, created: "2026-09-11T13:10:06.816Z", graduated: "2026-09-11T13:08:47.586Z", site: "https://www.stonkfun.xyz/", balance: 1_900_000, divs: 310.4, tagline: "it's in the name. paid in STRCx.", firstDep: 5, clicks: 1_207 },
  { mint: "8RNUw4N655VSrZKuhGdywhbSMDTrheguFPfxbpE2NZHQ", symbol: "PURR", name: "Hypurr", image: "https://gateway.irys.xyz/ENbdipSawCZv6Z4Lv1hvGpppmnbS3pArfrpJtcTi7p3a", pool: "Ad7pbBvVRNofo96WR6eHwmU2o4naZ6Lao1J98hW8a1TQ", qMint: "98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g", qSymbol: "HYPE", qCat: "custom", qLabel: "Custom", qDec: 8, mode: "reward", bps: 300, price: 0.012470090589625315, mcap: 12073353, chg: 327.87, created: "2026-08-20T01:07:55.607Z", graduated: "2026-08-20T01:40:57.700Z", balance: 520_000, divs: 640.2, tagline: "purring on HYPE.", firstDep: 60, clicks: 5_530 },
  { mint: "AGi2s9zPRPHs3zEDPhPTroumTEXK5ufymYSfEFndCSSW", symbol: "LEVERCAT", name: "Leveraged Cat", image: "https://gateway.irys.xyz/72ipFM6nub2FJEzQjhLSG2KGq7YDFQ2qmp8ZpYwcNKyh", pool: "2aaw5Wk7mX1jxajGE2YTRz3ScjuksktU3ijhSPmrsXeg", qMint: "4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs", qSymbol: "xSOL", qCat: "leverage", qLabel: "Leverage", qDec: 9, mode: "reward", bps: 300, price: 0.003930682405508883, mcap: 3930682, chg: -25.55, created: "2026-09-07T11:20:03.301Z", graduated: "2026-09-07T11:33:22.184Z", site: "https://levercat.money/", tw: "https://x.com/LeverCatSol", balance: 1_100_000, divs: 88.7, tagline: "9 lives, 3x leverage.", firstDep: 30, clicks: 2_104 },
  { mint: "7ssJZGFT3twGqeYA1kvpoMWwZYvMZvrMEbjRaWgg46BL", symbol: "BUTTHOLE", name: "BUTTHOLE", image: "https://gateway.irys.xyz/CwPUFPnbHxAKQq71YFYTHSRovwTt2hZqYne3RGbp2a5Z", pool: "HX72xZ1CHg7cWPhGGJyHbLp3sLrpznTYmWn5AY3FVwUj", qMint: "Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw", qSymbol: "ANTHROPIC", qCat: "prestock", qLabel: "PreStock", qDec: 8, mode: "reward", bps: 100, price: 0.003281598121147056, mcap: 3236375, chg: 59.98, created: "2026-08-05T21:45:04.100Z", graduated: "2026-08-05T22:13:36.040Z", balance: 900_000, divs: 145.0, tagline: "paired with pre-IPO anthropic. yes really.", firstDep: 300, clicks: 18_004 },
  { mint: "6UtY9iTZMQQ5QZVrbzFnNaJntV7oySm9k97mvwnuZcxr", symbol: "NEARKAT", name: "NearKat", image: "https://gateway.irys.xyz/EiwGr8C8Jf1MqrB1GbCCEjNXzXpr1NNhcitM6u39DQEA", pool: "F5kpA8oXhgaPKEyoyMRwaZSkQpo4f1YBsMaNjtrhhBrA", qMint: "3ZLekZYq2qkZiSpnSvabjit34tUkjSwD1JFuW9as9wBG", qSymbol: "NEAR", qCat: "custom", qLabel: "Custom", qDec: 9, mode: "reward", bps: 300, price: 0.005045873842757903, mcap: 5045873, chg: -44.4, created: "2026-09-07T00:36:30.252Z", graduated: "2026-09-07T03:48:20.385Z", site: "https://nearkat.xyz/", tw: "https://x.com/NearKatSol", balance: 400_000, divs: 52.3, tagline: "kat. near. you get it.", firstDep: 48, clicks: 1_880 },
  { mint: "CFNRDaxFcvRwRSNnA5cHrCCr6AHhk9dNkHWpRUjNupFL", symbol: "RAYCAT", name: "Raydium Cat", image: "https://gateway.irys.xyz/B77x6QzyvAbwR6RXZyQajSN6TppjKsRxTa5YfVqCss5W", pool: "987VwvJZ5FRjWCY9ZwC2tRUGL8FbMT1aF4pUrT7XjPjD", qMint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", qSymbol: "RAY", qCat: "custom", qLabel: "Custom", qDec: 6, mode: "reward", bps: 300, price: 0.011909731263782057, mcap: 11506623, chg: 103.29, created: "2026-08-13T12:30:24.634Z", graduated: "2026-08-13T12:36:12.384Z", balance: 95_000, divs: 210.9, tagline: "the cat that swims in the pool.", firstDep: 400, clicks: 3_310 },
  { mint: "8K5X85PAJHAAVSvYaAzgVPPAPsqqHmvx16ZyBiscYF8L", symbol: "CTO", name: "Vida Global CTO", image: "https://gateway.irys.xyz/4syUGiNTPTLETc79E8mwFjaojnGQ7hVrEqpx9C7ZkqEj", pool: "EDBMuQjwzwP8dxe7GwDTFsBSeCr2hEtyWs8hXV2No95T", qMint: "XsfCC9VL4DamVGNgdJpfLXB3sBVa158Gbx8sh7NzmTk", qSymbol: "VIDAX", qCat: "xstock", qLabel: "xStock", qDec: 8, mode: "standard", bps: 0, price: 0.003874397905763294, mcap: 3546530, chg: 33.04, created: "2026-09-01T08:17:57.089Z", graduated: "2026-09-01T08:32:58.813Z", balance: 150_000, divs: 0, tagline: "community takeover, stock-paired.", firstDep: 120, clicks: 640 },
];

export const mockListings: Listing[] = seeds.map((s) => {
  const bag = s.balance * s.price;
  return {
    mint: s.mint, pool: s.pool, name: s.name, symbol: s.symbol, image_url: s.image,
    quote_mint: s.qMint, quote_symbol: s.qSymbol, quote_category: s.qCat, quote_label: s.qLabel, quote_decimals: s.qDec,
    mode: s.mode, transfer_fee_bps: s.mode === "reward" ? s.bps : null,
    status: "graduated", graduated_at: s.graduated, created_on_stonkfun: s.created,
    creator_wallet: null, owner_wallet: "Hank0stonk1istTreasuryDemoWa11etXXXXXXXXXXX",
    site_url: s.site ?? null, tagline: s.tagline, category: s.qCat,
    balance: s.balance, price_usd: s.price, price_change_24h: s.chg, market_cap_usd: s.mcap,
    dividends_usd: s.divs, bag_usd: bag, score_usd: bag + s.divs, peak_score_usd: (bag + s.divs) * 1.15,
    first_deposit_at: ago(s.firstDep), last_deposit_at: ago(Math.min(s.firstDep, 3 + (s.clicks % 20))),
    clicks: s.clicks, hidden: false, created_at: ago(s.firstDep + 1), updated_at: ago(0.05),
  };
});

const wallets = [
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZZkFqL9k1pQfVfWn",
  "3nTvhQ7yDmXbfyNMa6KXa7Ao5cFwJdtWWkN3a9QYPhuh",
  "B7gsnYpWv4Q4xq5rS3JQrBaDnVvXvoRq6z7nLtZuFcQm",
  "DmP2rYvvzL7kSa8dQwJQhXsEy4xZ4FvDa9Ao6rRZz3Cx",
];
const sig = (i: number) => `${i.toString(36).padStart(4, "0")}mockSig${"x".repeat(60)}`.slice(0, 88);

let id = 1;
export const mockDeposits: Deposit[] = mockListings.flatMap((l, li) =>
  Array.from({ length: 3 + (li % 3) }, (_, i) => {
    const amount = Math.round(l.balance / (3 + (li % 3)));
    const hoursAgo = i === 0 ? (Date.now() - Date.parse(l.first_deposit_at!)) / 3.6e6 : (li * 7 + i * 11) % 90;
    return {
      id: id++, signature: sig(id), mint: l.mint, from_wallet: wallets[(li + i) % wallets.length],
      amount, usd_at_deposit: amount * (l.price_usd ?? 0) * (0.7 + ((li + i) % 5) * 0.1),
      slot: 300_000_000 + id * 17, block_time: ago(hoursAgo), source: "webhook",
    };
  }),
);

export const mockDividends: DividendEvent[] = mockListings
  .filter((l) => l.mode === "reward")
  .flatMap((l, li) =>
    Array.from({ length: 4 }, (_, i) => {
      const usd = l.dividends_usd / 4;
      return {
        id: id++, signature: sig(id), quote_mint: l.quote_mint!, from_wallet: "StonkDistribut0rXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        amount: usd / 12, usd_at_receipt: usd, attributed_mint: l.mint, attribution: "exact" as const,
        block_time: ago((li * 5 + i * 9) % 70 + 0.5),
      };
    }),
  );

export const mockActivity: Activity[] = [
  ...mockDeposits.map((d) => {
    const l = mockListings.find((x) => x.mint === d.mint)!;
    return { id: d.id, kind: "deposit" as const, mint: d.mint, wallet: d.from_wallet, amount: d.amount, usd: d.usd_at_deposit, created_at: d.block_time!, symbol: l.symbol, image_url: l.image_url, quote_symbol: l.quote_symbol };
  }),
  ...mockDividends.map((d) => {
    const l = mockListings.find((x) => x.mint === d.attributed_mint)!;
    return { id: d.id, kind: "dividend" as const, mint: l.mint, wallet: d.from_wallet, amount: d.amount, usd: d.usd_at_receipt, created_at: d.block_time!, symbol: l.symbol, image_url: l.image_url, quote_symbol: l.quote_symbol };
  }),
].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

export function mockSnapshots(mint: string): PriceSnapshot[] {
  const l = mockListings.find((x) => x.mint === mint);
  if (!l) return [];
  const pts: PriceSnapshot[] = [];
  let seed = mint.charCodeAt(0) + mint.charCodeAt(5);
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let p = (l.price_usd ?? 0) / (1 + (l.price_change_24h ?? 0) / 100) * 0.8;
  for (let i = 48; i >= 0; i--) {
    p = i === 0 ? l.price_usd ?? 0 : p * (0.97 + rnd() * 0.07);
    pts.push({ mint, price_usd: p, market_cap_usd: null, score_usd: l.balance * p + l.dividends_usd * (1 - i / 60), taken_at: ago(i) });
  }
  return pts;
}
