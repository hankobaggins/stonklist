"use client";
import { usd } from "@/lib/format";

export function ShareButton({ mint, symbol, rank, score }: { mint: string; symbol: string; rank: number; score: number }) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/t/${mint}`;
  const text = `$${symbol} is #${rank} on stonklist.lol with ${usd(score)} in the treasury. airdrop us your stonk 👇`;
  const href = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="btn-secondary h-9 px-4 text-[13px]">
      share on X
    </a>
  );
}
