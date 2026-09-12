import Link from "next/link";
import type { RankedListing } from "@/lib/types";
import { TokenImage } from "@/components/TokenImage";
import { RankBadge } from "./RankBadge";
import { ScoreCell } from "./ScoreCell";
import { QuoteChip, ModeChip } from "@/components/Chips";
import { compact, hostOf, timeAgo } from "@/lib/format";

const topFill: Record<number, string> = {
  1: "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
  2: "bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]",
  3: "bg-[color-mix(in_srgb,var(--accent)_3%,transparent)]",
};

export function Row({ l }: { l: RankedListing }) {
  const top = l.rank <= 3;
  const host = hostOf(l.site_url);
  return (
    <Link
      href={`/t/${l.mint}`}
      className={`group flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-4 transition-colors ${
        top ? `rounded-[24px] border border-line ${topFill[l.rank]} hover:bg-elev-2` : "border-b border-line hover:bg-elev-1 rounded-[24px]"
      }`}
    >
      <RankBadge rank={l.rank} />
      <TokenImage src={l.image_url} alt={l.symbol} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-semibold text-[15px] text-fg truncate">
            <span className="mono">${l.symbol}</span>
            <span className="text-fg-2 font-medium"> · {l.name}</span>
          </span>
        </div>
        {l.tagline ? <p className="text-[13px] text-fg-2 truncate">{l.tagline}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-fg-3">
          <QuoteChip symbol={l.quote_symbol} label={l.quote_label} category={l.quote_category} />
          <ModeChip mode={l.mode} bps={l.transfer_fee_bps} />
          <span className="hidden sm:inline">· {timeAgo(l.first_deposit_at)}</span>
          {host ? <span className="hidden sm:inline">· {host}</span> : null}
          <span className="hidden sm:inline">· {compact(l.clicks, 0)} clicks</span>
          <span className="hidden sm:inline text-fg-3 group-hover:text-accent-fg">· see details</span>
        </div>
      </div>
      <ScoreCell
        score={l.score_usd}
        change24h={l.score_change_24h_usd}
        dividends={l.dividends_usd}
        dividendSymbol={l.quote_symbol}
      />
    </Link>
  );
}
