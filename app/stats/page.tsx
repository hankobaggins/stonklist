import type { Metadata } from "next";
import { getLeaderboard, getTotals } from "@/lib/data";
import { StatTile } from "@/components/StatTile";
import { usd, usdCompact } from "@/lib/format";
import { env, hasTreasury } from "@/lib/env";
import { CopyButton } from "@/components/CopyButton";

export const revalidate = 60;
export const metadata: Metadata = { title: "Stats" };

export default async function StatsPage() {
  const [t, board] = await Promise.all([getTotals(), getLeaderboard()]);
  const reward = board.filter((l) => l.mode === "reward");
  const byQuote = new Map<string, number>();
  for (const l of board) byQuote.set(l.quote_label ?? "Custom", (byQuote.get(l.quote_label ?? "Custom") ?? 0) + l.score_usd);
  return (
    <div className="pt-10">
      <section className="text-center pb-8">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em]">Treasury</h1>
        <p className="mt-2 text-[15px] text-fg-2">what we hold, what it&apos;s paid us. all mark-to-market except dividends, which are frozen at receipt.</p>
      </section>
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="Total score" value={usd(t.score_usd)} />
        <StatTile label="Bag value" value={usd(t.bag_usd)} sub="Σ balance × price" />
        <StatTile label="Dividends received" value={usd(t.dividends_usd)} tone="positive" sub="lifetime, USD at receipt" />
        <StatTile label="Listings" value={t.listings} sub={`${reward.length} reward-mode`} />
        <StatTile label="Deposits" value={t.deposits} />
      </section>
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">By pairing</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {[...byQuote.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <li key={k} className="flex items-center gap-3 text-[13px]">
                <span className="w-24 text-fg-2">{k}</span>
                <span className="flex-1 h-2 rounded-full bg-elev-2 overflow-hidden">
                  <span className="block h-full bg-accent rounded-full" style={{ width: `${(v / (t.score_usd || 1)) * 100}%` }} />
                </span>
                <span className="mono w-20 text-right">{usdCompact(v)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-[14px] font-semibold tracking-[-0.02em]">Treasury wallet</h2>
          {hasTreasury ? (
            <>
              <div className="mt-3 flex items-center gap-2 rounded-[20px] border border-line-strong bg-bg px-3 h-11">
                <span className="mono text-[12.5px] truncate flex-1">{env.treasuryWallet}</span>
                <CopyButton text={env.treasuryWallet} />
              </div>
              <p className="mt-2 text-[12px] text-fg-3">
                verify anything on{" "}
                <a className="text-accent-fg hover:underline" href={`https://solscan.io/account/${env.treasuryWallet}`} target="_blank" rel="noreferrer">solscan</a>.
                one wallet for every deposit and every dividend. nothing here ever signs a transaction.
              </p>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-fg-3">not configured.</p>
          )}
        </div>
      </section>
    </div>
  );
}
