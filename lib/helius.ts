import { z } from "zod";
import { env } from "@/lib/env";

/** Helius Enhanced Webhook payload (subset we use). CLAUDE.md §6.2 */
export const TokenTransferSchema = z.object({
  fromUserAccount: z.string().nullable().optional(),
  toUserAccount: z.string().nullable().optional(),
  fromTokenAccount: z.string().nullable().optional(),
  toTokenAccount: z.string().nullable().optional(),
  tokenAmount: z.number(),
  mint: z.string(),
  tokenStandard: z.string().optional(),
});

export const HeliusTxSchema = z.object({
  signature: z.string(),
  slot: z.number().optional(),
  timestamp: z.number().optional(), // unix seconds
  type: z.string().optional(),
  source: z.string().optional(),
  fee: z.number().optional(),
  feePayer: z.string().optional(),
  tokenTransfers: z.array(TokenTransferSchema).optional().default([]),
  transactionError: z.unknown().nullable().optional(),
});
export type HeliusTx = z.infer<typeof HeliusTxSchema>;
export const HeliusWebhookSchema = z.array(HeliusTxSchema);

export interface InboundTransfer {
  signature: string;
  slot: number | null;
  blockTime: string | null;
  mint: string;
  fromWallet: string;
  amount: number;
}

/** Extract every transfer INTO the treasury wallet from a webhook batch. */
export function extractInbound(txs: HeliusTx[], treasury: string): InboundTransfer[] {
  const out: InboundTransfer[] = [];
  for (const tx of txs) {
    if (tx.transactionError) continue;
    for (const t of tx.tokenTransfers) {
      if (t.toUserAccount !== treasury) continue;
      if (!t.tokenAmount || t.tokenAmount <= 0) continue;
      if (t.fromUserAccount === treasury) continue; // self-move
      out.push({
        signature: tx.signature,
        slot: tx.slot ?? null,
        blockTime: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null,
        mint: t.mint,
        fromWallet: t.fromUserAccount ?? "unknown",
        amount: t.tokenAmount,
      });
    }
  }
  return out;
}

/** Constant-time-ish comparison for the webhook Authorization header. */
export function verifyWebhookAuth(header: string | null): boolean {
  const secret = env.heliusWebhookSecret;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ---------- DAS: getAssetsByOwner (fungible balances of the treasury) ---------- */

const DasItemSchema = z.object({
  id: z.string(),
  interface: z.string().optional(),
  token_info: z
    .object({
      balance: z.number().optional(),
      decimals: z.number().optional(),
      symbol: z.string().optional(),
      price_info: z.object({ price_per_token: z.number().optional(), total_price: z.number().optional() }).optional(),
    })
    .optional(),
});
const DasResponseSchema = z.object({
  result: z.object({
    items: z.array(DasItemSchema),
    total: z.number().optional(),
    limit: z.number().optional(),
    page: z.number().optional(),
  }),
});

export interface DasBalance {
  mint: string;
  balance: number; // token units
  decimals: number;
  priceUsd: number | null;
}

export function heliusRpcUrl(): string {
  if (!env.heliusApiKey) throw new Error("HELIUS_API_KEY missing");
  return `https://mainnet.helius-rpc.com/?api-key=${env.heliusApiKey}`;
}

export async function getTreasuryBalances(owner: string): Promise<DasBalance[]> {
  const out: DasBalance[] = [];
  for (let page = 1; page < 50; page++) {
    const res = await fetch(heliusRpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "stonklist",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: owner,
          page,
          limit: 1000,
          tokenType: "fungible",
          displayOptions: { showZeroBalance: false, showNativeBalance: false },
        },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Helius DAS ${res.status}`);
    const parsed = DasResponseSchema.parse(await res.json());
    for (const it of parsed.result.items) {
      const dec = it.token_info?.decimals ?? 0;
      const raw = it.token_info?.balance ?? 0;
      out.push({
        mint: it.id,
        decimals: dec,
        balance: raw / 10 ** dec,
        priceUsd: it.token_info?.price_info?.price_per_token ?? null,
      });
    }
    if (parsed.result.items.length < 1000) break;
  }
  return out;
}

/** Register (or update) the Enhanced Webhook for the treasury wallet. Used by scripts/register-helius-webhook.ts */
export async function registerWebhook(opts: { webhookUrl: string; treasury: string; authHeader: string }) {
  const base = `https://api.helius.xyz/v0/webhooks?api-key=${env.heliusApiKey}`;
  const body = {
    webhookURL: opts.webhookUrl,
    transactionTypes: ["TRANSFER"],
    accountAddresses: [opts.treasury],
    webhookType: "enhanced",
    authHeader: opts.authHeader,
  };
  const existing = await fetch(base).then((r) => r.json()) as { webhookID: string; webhookURL: string }[];
  const mine = existing.find((w) => w.webhookURL === opts.webhookUrl);
  const res = mine
    ? await fetch(`https://api.helius.xyz/v0/webhooks/${mine.webhookID}?api-key=${env.heliusApiKey}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    : await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Helius webhook ${res.status}: ${await res.text()}`);
  return res.json();
}
