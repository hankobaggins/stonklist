import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Rules" };

const rules: [string, string][] = [
  ["score = bag + divs", "Your score is the USD value of the treasury's balance of your token right now, plus the USD value of every dividend that token has paid the treasury since the first airdrop. Bag floats with price. Dividends are locked in at the moment they arrive and never re-marked."],
  ["stonkfun only", "A mint is eligible if it exists on stonkfun.xyz. Anything else sent to the wallet is ignored for ranking (we still log it)."],
  ["one listing per mint", "Everyone who sends the same token adds to the same bag. Whoever registered the mint first (by wallet signature) owns the listing's tagline and link."],
  ["we hodl", "Deposits are final. We don't sell, we don't refund, we don't return. If your token goes to zero, your bag goes to zero. Dividends already earned stay in the score."],
  ["all tokens equal", "Standard and reward-mode tokens rank by the same formula. Reward-mode tokens just have a second way to climb: the transfer tax they pay to holders."],
  ["dividends tracked, not promised", "We show what the treasury has actually received. No projections, no APY, no guarantees."],
  ["no accounts, no keys", "Wallet-connect is only used to sign a message when registering a listing. We never ask for private keys, API keys, or approvals."],
  ["ties", "Equal score? Earliest first deposit wins."],
  ["moderation", "We can hide a listing that's illegal or impersonating someone. Hidden listings keep their bag; we still don't sell it."],
  ["not financial advice", "This is a leaderboard. It is not a recommendation to buy, sell, or hold anything."],
];

export default function RulesPage() {
  return (
    <div className="pt-10 mx-auto max-w-[720px]">
      <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em] text-center">Rules</h1>
      <p className="mt-2 text-center text-[15px] text-fg-2">short on purpose.</p>
      <ol className="mt-8 flex flex-col gap-3">
        {rules.map(([h, body], i) => (
          <li key={h} className="card p-5 flex gap-4">
            <span className="mono text-accent-fg font-semibold w-8 shrink-0">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="font-semibold text-[15px]">{h}</h2>
              <p className="text-[13.5px] text-fg-2 mt-1 leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 text-center">
        <Link href="/list" className="btn-primary">Claim a rank</Link>
      </div>
    </div>
  );
}
