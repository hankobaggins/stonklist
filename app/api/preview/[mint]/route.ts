import { NextResponse } from "next/server";
import { absoluteAsset, getToken } from "@/lib/stonkfun";
import { getLeaderboard } from "@/lib/data";
import { claimPrice } from "@/lib/scoring";
import { isValidPubkey } from "@/lib/sign";

export const runtime = "nodejs";

/** Live eligibility check for the claim flow. */
export async function GET(_: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (!isValidPubkey(mint)) return NextResponse.json({ error: "that's not a Solana address" }, { status: 400 });
  const t = await getToken(mint).catch(() => undefined);
  if (t === undefined) return NextResponse.json({ error: "StonkFun API unreachable" }, { status: 502 });
  if (t === null) return NextResponse.json({ error: "not a StonkFun token. only stonkfun.xyz launches are eligible." }, { status: 404 });
  const board = await getLeaderboard();
  const top = board[0]?.score_usd ?? 0;
  const mine = board.find((l) => l.mint === mint);
  return NextResponse.json({
    mint: t.mint,
    name: t.name,
    symbol: t.symbol,
    imageUrl: absoluteAsset(t.imageUrl),
    quote: { symbol: t.quote.symbol, category: t.quote.category, categoryLabel: t.quote.categoryLabel },
    mode: t.mode,
    transferFeeBps: t.transferFee?.bps ?? null,
    priceUsd: t.market.priceUsd ?? null,
    marketCapUsd: t.market.marketCapUsd ?? null,
    alreadyListed: Boolean(mine),
    currentScore: mine?.score_usd ?? 0,
    topScore: top,
    claimPrice: claimPrice(top, mine?.score_usd ?? 0),
  });
}
