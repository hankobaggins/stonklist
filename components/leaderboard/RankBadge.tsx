export function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className={className} aria-label="#1">
      <path d="M3 18h18l1.2-11-5.4 4.2L12 4l-4.8 7.2L1.8 7 3 18Zm0 2h18v1.5H3V20Z" />
    </svg>
  );
}

export function RankBadge({ rank, size = "lg" }: { rank: number; size?: "lg" | "sm" }) {
  const top = rank <= 3;
  return (
    <span
      className={`mono font-semibold inline-flex items-center gap-1 ${
        size === "lg" ? "text-[18px] w-12" : "text-[12px] w-8"
      } ${top ? "text-accent-fg" : "text-fg-3"}`}
    >
      {rank === 1 && size === "lg" ? <Crown className="text-gold" /> : null}#{rank}
    </span>
  );
}
