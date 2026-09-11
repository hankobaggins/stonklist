import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeposits, getDividendEvents, getLeaderboard, getListing, getSnapshots } from "@/lib/data";
import { claimPrice } from "@/lib/scoring";
import { env } from "@/lib/env";
import { compact, feePct, hostOf, pct, price, shortAddr, timeAgo, usd, usdCompact } from "@/lib/format";
import { TokenImage } from "@/components/TokenImage";
import { QuoteChip, ModeChip } from "@/components/Chips";
import { StatTile } from "@/components/StatTile";
import { Sparkline } from "@/components/Sparkline";
import { DepositInstructions } from "@/components/DepositInstructions";
import { ClickBeacon } from "@/components/ClickBeacon";
import { Crown } from "@/components/leaderboard/RankBadge";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 30;

type Params = { params: Promise<{ mint: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { mint } = await params;
  const l = await getListing(mint);
  if (!l) return { title: "not found" };
  const title = `#${l.rank} $${l.symbol} — ${usd(l.score_usd)} in the treasury`;
  return {
    title,
    description: l.tagline ?? `${l.name} on stonklist.lol`,
    openGraph: { title, url: `/t/${mint}`, images: [{ url: `/api/og/${mint}`, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description: l.tagline ?? `${l.name} on stonklist.lol`, images: [`/api/og/${mint}`] },
  };
}

export default async function ListingPage({ params }: Params) {
  const { mint } = await params;
  const l = await getListing(mint);
  if (!l) notFound();
  const [board, deposits, dividends, snaps] = await Promise.all([
    getLeaderboard(),
    getDeposits(mint),
    getDividendEvents(mint),
    getSnapshots(mint),
  ]);
  const top = board[0];
  const toTop = l.rank === 1 ? 0 : claimPrice(top?.score_usd ?? 0, l.score_usd);
  const host = hostOf(l.site_url);
  const pricePos = (l.price_change_24h ?? 0) >= 0;

  return (
    <article className="pt-8">
      <ClickBeacon mint={mint} />
      <Link href="/" className="text-[12.5px] text-fg-3 hover:text-fg">← back to the list</Link>

      <header className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <TokenImage src={l.image_url} alt={l.symbol} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`mono text-[20px] font-semibold ${l.rank <= 3 ? "text-accent-fg" : "text-fg-3"} inline-flex items-center gap-1`}>
              {l.rank === 1 ? <Crown className="text-gold" /> : null}#{l.rank}
            </span>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] truncate">
              <span className="mono">${l.symbol}</span> <span className="text-fg-2 font-medium">· {l.name}</span>
            </h1>
          </div>
          {l.tagline ? <p className="text-[14px] text-fg-2 mt-1">{l.tagline}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-fg-3">
            <QuoteChip symbol={l.quote_symbol} label={l.quote_label} category={l.quote_category} />
            <ModeChip mode={l.mode} bps={l.transfer_fee_bps} />
            {l.status ? <span className="badge">{l.status}</span> : null}
            {host ? (
              <a href={l.site_url!} target="_blank" rel="noreferrer" className="badge hover:text-fg">{host} ↗</a>
            ) : null}
            <a href={`https://www.stonkfun.xyz/token/${mint}`} target="_blank" rel="noreferrer" className="badge hover:text-fg">stonkfun ↗</a>
            <a href={`https://solscan.io/token/${mint}`} target="_blank" rel="noreferrer" className="badge hover:text-fg">solscan ↗</a>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <ShareButton mint={mint} symbol={l.symbol} rank={l.rank} score={l.score_usd} />
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Score" value={usd(l.score_usd)} sub={`bag ${usdCompact(l.bag_usd)} + divs ${usdCompact(l.dividends_usd)}`} />
        <StatTile label="Treasury balance" value={compact(l.balance, 2)} sub={`$${l.symbol}`} />
        <StatTile label="Price" value={price(l.price_usd)} sub={`mcap ${usdCompact(l.market_cap_usd)}`} />
        <StatTile label="24h" value={pct(l.price_change_24h)} tone={pricePos ? "positive" : "negative"} />
        <StatTile
          label="Dividends earned"
          value={l.mode === "reward" ? usd(l.dividends_usd) : "$0"}
          sub={l.mode === "reward" ? `paid in ${l.quote_symbol} · ${feePct(l.transfer_fee_bps)} tax` : "no transfer tax"}
          tone={l.dividends_usd > 0 ? "positive" : "default"}
        />
        <StatTile label="Deposits" value={deposits.length} sub={l.first_deposit_at ? `first ${timeAgo(l.first_deposit_at)}` : undefined} />
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold tracking-[-0.02em]">Score, last 48h</h2>
            <span className="text-[12px] text-fg-3">peak {usdCompact(l.peak_score_usd)}</span>
          </div>
          <div className="mt-3">
            <Sparkline points={snaps.map((s) => ({ t: Date.parse(s.taken_at), v: s.score_usd }))} />
          </div>
        </div>
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-[14px] font-semibold tracking-[-0.02em]">{l.rank === 1 ? "Holding #1" : `Take #1 from $${top?.symbol}`}</h2>
            <p className="mono text-[28px] font-semibold text-accent-fg mt-1">{l.rank === 1 ? "👑" : `~${usd(toTop)}`}</p>
            <p className="text-[12.5px] text-fg-2 mt-1">
              {l.rank === 1
                ? `next best is $${board[1]?.symbol ?? "—"} at ${usd(board[1]?.score_usd ?? 0)}.`
                : `send ≈ ${compact(l.price_usd ? toTop / l.price_usd : 0, 0)} $${l.symbol} at the current price, or wait for a pump.`}
            </p>
          </div>
          <Link href={`/list?mint=${mint}`} className="btn-primary mt-4">Add to the bag</Link>
        </div>
      </section>

      <section className="mt-6">
        <DepositInstructions treasury={env.treasuryWallet} symbol={l.symbol} mint={mint} />
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.02em] mb-2 px-1">Deposits</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="text-fg-3 text-left">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">from</th>
                  <th className="px-4 py-2 font-medium text-right">amount</th>
                  <th className="px-4 py-2 font-medium text-right">usd then</th>
                  <th className="px-4 py-2 font-medium text-right">when</th>
                </tr>
              </thead>
              <tbody>
                {deposits.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-fg-3">nobody&apos;s sent anything yet. be first.</td></tr>
                ) : (
                  deposits.map((d) => (
                    <tr key={d.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 mono"><a className="hover:text-accent-fg" href={`https://solscan.io/tx/${d.signature}`} target="_blank" rel="noreferrer">{shortAddr(d.from_wallet)}</a></td>
                      <td className="px-4 py-2 mono text-right">{compact(d.amount, 2)}</td>
                      <td className="px-4 py-2 mono text-right">{usd(d.usd_at_deposit)}</td>
                      <td className="px-4 py-2 text-right text-fg-3">{timeAgo(d.block_time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.02em] mb-2 px-1">Dividends received</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="text-fg-3 text-left">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">asset</th>
                  <th className="px-4 py-2 font-medium text-right">amount</th>
                  <th className="px-4 py-2 font-medium text-right">usd at receipt</th>
                  <th className="px-4 py-2 font-medium text-right">when</th>
                </tr>
              </thead>
              <tbody>
                {l.mode !== "reward" ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-fg-3">standard token: no transfer tax, so no dividends.</td></tr>
                ) : dividends.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-fg-3">no payouts received yet.</td></tr>
                ) : (
                  dividends.map((d) => (
                    <tr key={d.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 mono">
                        {l.quote_symbol}
                        {d.attribution === "estimated" ? <span className="badge ml-2">est.</span> : null}
                      </td>
                      <td className="px-4 py-2 mono text-right">{compact(d.amount, 4)}</td>
                      <td className="px-4 py-2 mono text-right text-positive">+{usd(d.usd_at_receipt, { cents: true })}</td>
                      <td className="px-4 py-2 text-right text-fg-3">{timeAgo(d.block_time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </article>
  );
}
