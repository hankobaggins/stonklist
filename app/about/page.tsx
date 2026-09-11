import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="pt-10 mx-auto max-w-[680px]">
      <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em] text-center">We hold. We track. You climb.</h1>
      <div className="mt-8 flex flex-col gap-5 text-[15px] text-fg-2 leading-relaxed">
        <p>
          outbid.lol proved people will pay for a spot on a list. stonklist.lol asks a dumber question: what if you
          couldn&apos;t pay in dollars, only in your own coin?
        </p>
        <p>
          So that&apos;s the whole product. Projects launched on <a className="text-accent-fg hover:underline" href="https://www.stonkfun.xyz" target="_blank" rel="noreferrer">StonkFun</a> airdrop their
          token to one public treasury wallet. We never sell. The token we hold the most of, in dollars, sits at #1. Prices
          move, so ranks move. A pump climbs you. A dump drops you. Nobody gets a refund.
        </p>
        <p>
          The twist: many StonkFun coins are <span className="text-fg">reward-mode</span> — a 1–3% transfer tax gets paid out to
          holders in the coin&apos;s quote asset (SPYx, ZEC, SOL, whatever it&apos;s paired with). Since the treasury is a holder,
          it earns those dividends, and we count every dollar received toward your score. Forever. Even if your bag goes to zero.
        </p>
        <p>
          Everything is verifiable on-chain. The treasury address is on every page. The app can only read the wallet;
          it never signs anything. Moving tokens is a human decision, made nowhere near this codebase, and the rule is we don&apos;t.
        </p>
        <p className="text-fg-3 text-[13px]">
          not financial advice. a leaderboard is not a recommendation. tokens can and do go to zero.
        </p>
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/rules" className="btn-secondary">Read the rules</Link>
        <Link href="/list" className="btn-primary">Claim a rank</Link>
      </div>
    </div>
  );
}
