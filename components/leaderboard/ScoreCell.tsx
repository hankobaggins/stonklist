import { usd, usdCompact } from "@/lib/format";

export function ScoreCell({
  score,
  change24h,
  dividends,
  dividendSymbol = null,
  compact = false,
}: {
  score: number;
  change24h: number | null;
  dividends: number;
  dividendSymbol?: string | null;
  compact?: boolean;
}) {
  const pos = (change24h ?? 0) >= 0;
  return (
    <div className="text-right shrink-0">
      <div className={`mono font-semibold text-fg ${compact ? "text-[14px]" : "text-[17px]"}`}>
        {compact ? usdCompact(score) : usd(score)}
      </div>
      {!compact && change24h !== null ? (
        <div className={`mono text-[12px] ${pos ? "text-positive" : "text-negative"}`}>
          {pos ? "+" : "−"}
          {usdCompact(Math.abs(change24h))} 24h
        </div>
      ) : null}
      {!compact && dividends > 0 ? (
        <div className="mono text-[12px] text-positive">+{usdCompact(dividends)} divs</div>
      ) : null}
      {!compact && dividends > 0 && dividendSymbol ? (
        <div className="mono text-[11px] text-fg-3">in {dividendSymbol}</div>
      ) : null}
    </div>
  );
}
