import Link from "next/link";
import { env, hasTreasury } from "@/lib/env";
import { shortAddr } from "@/lib/format";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-4 sm:items-center justify-between text-[12.5px] text-fg-3">
        <div className="flex flex-wrap items-center gap-x-2">
          <span>no ads</span><span>·</span>
          <span>no api keys</span><span>·</span>
          <span>no refunds</span><span>·</span>
          <span>not financial advice</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            treasury:{" "}
            <span className="mono text-fg-2">{hasTreasury ? shortAddr(env.treasuryWallet, 6) : "not configured"}</span>
          </span>
          <Link href="/rules" className="hover:text-fg">rules</Link>
          <Link href="/about" className="hover:text-fg">about</Link>
          <a href="https://www.stonkfun.xyz" target="_blank" rel="noreferrer" className="hover:text-fg">stonkfun ↗</a>
        </div>
      </div>
      <p className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-8 text-[11.5px] text-fg-3/80 leading-relaxed">
        stonklist.lol is an entertainment leaderboard. Tokens sent to the treasury are non-refundable donations. Nothing on
        this site is investment, legal or tax advice. Rankings reflect what the treasury holds, not what anything is worth.
        Dividend figures are amounts actually received, not projections. Tokens can go to zero.
      </p>
    </footer>
  );
}
