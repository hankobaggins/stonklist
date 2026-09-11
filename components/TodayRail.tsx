import Link from "next/link";
import type { TodayListing } from "@/lib/types";
import { TokenImage } from "@/components/TokenImage";
import { usdCompact } from "@/lib/format";

export function TodayRail({ rows }: { rows: TodayListing[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-[14px] font-semibold tracking-[-0.02em] flex items-center gap-2">
          <span className="live-dot" /> Today&apos;s ranking
        </h2>
        <Link href="/today" className="text-[12px] text-accent-fg hover:underline">
          See all ›
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-fg-3 px-1">quiet day. nobody&apos;s deposited in 24h.</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((r) => (
            <li key={r.mint}>
              <Link href={`/t/${r.mint}`} className="flex items-center gap-2.5 py-2 px-1 rounded-xl hover:bg-elev-1 transition-colors">
                <span className={`mono text-[12px] w-7 ${r.rank <= 3 ? "text-accent-fg" : "text-fg-3"}`}>#{r.rank}</span>
                <TokenImage src={r.image_url} alt={r.symbol} size={24} />
                <span className="text-[13px] truncate flex-1">
                  <span className="mono font-semibold">${r.symbol}</span>
                  <span className="text-fg-3"> · {r.name}</span>
                </span>
                <span className="mono text-[12.5px] font-semibold text-positive">+{usdCompact(r.today_usd)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
