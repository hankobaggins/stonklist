import { z } from "zod";

/**
 * Typed, keyless client for the StonkFun public API (CLAUDE.md §6.1).
 * Rate limit: 300 req/min/IP. We honor Retry-After on 429.
 */
export const STONKFUN_BASE =
  process.env.STONKFUN_API_BASE ?? "https://www.stonkfun.xyz/api/public/v1";
export const STONKFUN_SITE = "https://www.stonkfun.xyz";

const QuoteSchema = z.object({
  mint: z.string(),
  symbol: z.string(),
  name: z.string().optional().default(""),
  logoUrl: z.string().optional().nullable(),
  category: z.string().optional().default("custom"),
  categoryLabel: z.string().optional().default("Custom"),
});

const MarketSchema = z.object({
  priceUsd: z.number().nullable().optional(),
  marketCapUsd: z.number().nullable().optional(),
  fdvUsd: z.number().nullable().optional(),
  volume24hUsd: z.number().nullable().optional(),
  liquidityUsd: z.number().nullable().optional(),
  priceChange24h: z.number().nullable().optional(),
  peakMarketCapUsd: z.number().nullable().optional(),
});

export const StonkTokenSchema = z.object({
  mint: z.string(),
  pool: z.string().optional().nullable(),
  name: z.string(),
  symbol: z.string(),
  quote: QuoteSchema,
  creator: z.string().optional().nullable(),
  launchpad: z.string().optional().nullable(),
  mode: z.enum(["standard", "reward"]).catch("standard"),
  quoteOnlyFees: z.boolean().optional(),
  transferFee: z.object({ bps: z.number() }).optional().nullable(),
  flywheel: z.object({ active: z.boolean() }).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  metadataUri: z.string().optional().nullable(),
  links: z.record(z.string(), z.string()).optional().default({}),
  market: MarketSchema.optional().default({}),
  status: z.enum(["new", "aboutToGraduate", "graduated"]).catch("new"),
  graduationProgress: z.number().optional().nullable(),
  graduatedAt: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
});
export type StonkToken = z.infer<typeof StonkTokenSchema>;

export const PairSchema = z.object({
  mint: z.string(),
  symbol: z.string(),
  name: z.string().optional().default(""),
  decimals: z.number().optional().default(9),
  logoUrl: z.string().optional().nullable(),
  category: z.string().optional().default("custom"),
  categoryLabel: z.string().optional().default("Custom"),
  tokenProgram: z.string().optional(),
  launchable: z.boolean().optional(),
});
export type StonkPair = z.infer<typeof PairSchema>;

export const RewardLaunchSchema = z.object({
  mint: z.string(),
  quote: z.object({ mint: z.string(), symbol: z.string(), decimals: z.number() }),
  distributedRaw: z.string().optional(),
  distributedTokens: z.number().optional(),
  payoutCount: z.number().optional(),
  holderCount: z.number().optional(),
  lastPayoutAt: z.string().optional().nullable(),
});
export type RewardLaunch = z.infer<typeof RewardLaunchSchema>;

const ErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string().optional() }),
});

export class StonkFunError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function get<T>(
  path: string,
  schema: z.ZodType<T>,
  opts: { revalidate?: number; retries?: number } = {},
): Promise<T> {
  const { revalidate = 30, retries = 2 } = opts;
  const url = `${STONKFUN_BASE}${path}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate },
    });
    if (res.status === 429 && attempt < retries) {
      const wait = Number(res.headers.get("retry-after") ?? "1") * 1000;
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
      continue;
    }
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const parsed = ErrorSchema.safeParse(json);
      throw new StonkFunError(
        parsed.success ? parsed.data.error.code : `http_${res.status}`,
        parsed.success ? (parsed.data.error.message ?? "") : res.statusText,
        res.status,
      );
    }
    const body = json as { data?: unknown };
    return schema.parse(body?.data ?? json);
  }
}

/** Eligibility check + metadata. Returns null when the mint is not a StonkFun token (404). */
export async function getToken(mint: string): Promise<StonkToken | null> {
  try {
    return await get(`/tokens/${mint}`, StonkTokenSchema, { revalidate: 30 });
  } catch (e) {
    if (e instanceof StonkFunError && e.status === 404) return null;
    throw e;
  }
}

export async function listTokens(page = 1, pageSize = 25): Promise<StonkToken[]> {
  const data = await get(
    `/tokens?page=${page}&pageSize=${pageSize}`,
    z.object({ tokens: z.array(StonkTokenSchema) }),
    { revalidate: 300 },
  );
  return data.tokens;
}

export async function getPairs(): Promise<StonkPair[]> {
  const data = await get(
    "/pairs",
    z.union([z.array(PairSchema), z.object({ pairs: z.array(PairSchema) })]),
    { revalidate: 86400 },
  );
  return Array.isArray(data) ? data : data.pairs;
}

export async function getRewards(): Promise<RewardLaunch[]> {
  const data = await get(
    "/rewards",
    z.union([
      z.array(RewardLaunchSchema),
      z.object({ launches: z.array(RewardLaunchSchema) }),
    ]),
    { revalidate: 600 },
  );
  return Array.isArray(data) ? data : data.launches;
}

/** Fetch many mints with ≤ 300/min pacing (250 ms spacing). */
export async function getTokensPaced(
  mints: string[],
  onEach?: (mint: string, token: StonkToken | null) => Promise<void> | void,
): Promise<Map<string, StonkToken | null>> {
  const out = new Map<string, StonkToken | null>();
  for (const mint of mints) {
    const t = await getToken(mint).catch(() => null);
    out.set(mint, t);
    if (onEach) await onEach(mint, t);
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

/** StonkFun returns some image URLs relative to its own host. */
export function absoluteAsset(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${STONKFUN_SITE}${url}`;
}

export const STOCK_CATEGORIES = new Set(["xstock", "prestock"]);
export function isStockPaired(category: string | null | undefined): boolean {
  return !!category && STOCK_CATEGORIES.has(category);
}

export const PROGRAM_IDS = {
  launchLab: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  cpmm: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  clmm: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
} as const;
