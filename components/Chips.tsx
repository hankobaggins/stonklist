import { isStockPaired } from "@/lib/stonkfun";
import { feePct } from "@/lib/format";

export function Ticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M2 11 6 7l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 4h3v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function QuoteChip({
  symbol,
  label,
  category,
}: {
  symbol: string | null;
  label: string | null;
  category: string | null;
}) {
  const stock = isStockPaired(category);
  return (
    <span className="badge" title={`Paired with ${symbol ?? "?"} (${label ?? "Custom"})`}>
      {stock ? <Ticker className="text-accent-fg" /> : null}
      <span className="mono">{symbol ?? "?"}</span>
      <span className="text-fg-3">{label ?? "Custom"}</span>
    </span>
  );
}

export function ModeChip({ mode, bps }: { mode: "standard" | "reward"; bps: number | null }) {
  if (mode === "reward")
    return (
      <span className="badge border-positive/30 text-positive" title={`Reward mode: ${feePct(bps)} transfer tax paid to holders`}>
        reward · {feePct(bps)}
      </span>
    );
  return <span className="badge">standard</span>;
}
