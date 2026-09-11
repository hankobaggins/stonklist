"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usd } from "@/lib/format";
import { extractMint } from "@/lib/sign";

export function ClaimBar({ topScore, claimPrice }: { topScore: number; claimPrice: number }) {
  const [mint, setMint] = useState("");
  const router = useRouter();
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const m = extractMint(mint);
    router.push(m ? `/list?mint=${encodeURIComponent(m)}` : "/list");
  };
  return (
    <section className="text-center pt-8 sm:pt-12 pb-6">
      <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em] leading-[1.1]">
        Airdrop us your stonk.
      </h1>
      <p className="mt-2 text-[15px] text-fg-2">Highest bag in the treasury takes #1. We hodl. You climb.</p>
      <p className="mt-4 text-[22px] sm:text-[28px] font-semibold tracking-[-0.02em]">
        Take #1 for{" "}
        <span className="mono text-accent-fg" title={`#1 currently scores ${usd(topScore)} (+1% buffer)`}>
          ~{usd(claimPrice)}
        </span>
      </p>
      <form onSubmit={go} className="mt-6 mx-auto max-w-[640px] flex flex-col sm:flex-row gap-2">
        <input
          className="input w-full sm:flex-1 mono text-[13px]"
          placeholder="Paste a StonkFun mint address or stonkfun.xyz link"
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="btn-primary sm:w-[150px]">
          Claim rank
        </button>
      </form>
      <p className="mt-3 text-[12px] text-fg-3">only tokens launched on stonkfun.xyz are eligible · deposits are final</p>
    </section>
  );
}
