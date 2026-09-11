import type { Metadata } from "next";
import Link from "next/link";
import { getActivity, getToday } from "@/lib/data";
import { ViewToggle } from "@/components/ViewToggle";
import { TokenImage } from "@/components/TokenImage";
import { ActivityFeed } from "@/components/ActivityFeed";
import { usd } from "@/lib/format";

export const revalidate = 30;
export const metadata: Metadata = { title: "Today's ranking" };

export default async function TodayPage() {
  const [rows, activity] = await Promise.all([getToday(50), getActivity(30)]);
  return (
    <>
      <div className="mt-6">
        <ViewToggle />
      </div>
      <section className="text-center pt-8 pb-6">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em]">Today&apos;s movers</h1>
        <p className="mt-2 text-[15px] text-fg-2">USD deposited + dividends received in the last 24 hours.</p>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <ol className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <li className="card p-10 text-center text-fg-3">quiet day. nobody&apos;s deposited in 24h.</li>
          ) : (
            rows.map((r) => (
              <li key={r.mint}>
                <Link
                  href={`/t/${r.mint}`}
                  className={`flex items-center gap-4 px-5 py-4 rounded-[24px] transition-colors ${
                    r.rank <= 3 ? "border border-line bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]" : "border-b border-line"
                  } hover:bg-elev-2`}
                >
                  <span className={`mono text-[18px] font-semibold w-12 ${r.rank <= 3 ? "text-accent-fg" : "text-fg-3"}`}>#{r.rank}</span>
                  <TokenImage src={r.image_url} alt={r.symbol} size={40} />
                  <span className="flex-1 min-w-0 truncate">
                    <span className="mono font-semibold text-[15px]">${r.symbol}</span>
                    <span className="text-fg-2"> · {r.name}</span>
                    {r.quote_label ? <span className="badge ml-2">{r.quote_label}</span> : null}
                  </span>
                  <span className="mono text-[17px] font-semibold text-positive">+{usd(r.today_usd)}</span>
                </Link>
              </li>
            ))
          )}
        </ol>
        <aside>
          <h2 className="text-[14px] font-semibold tracking-[-0.02em] mb-2 px-1">Latest activity</h2>
          <ActivityFeed initial={activity} />
        </aside>
      </div>
    </>
  );
}
