import type { Metadata } from "next";
import { ClaimFlow } from "@/components/ClaimFlow";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Claim a rank" };

export default async function ListPage({ searchParams }: { searchParams: Promise<{ mint?: string }> }) {
  const { mint } = await searchParams;
  return (
    <div className="pt-10">
      <section className="text-center pb-6">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-[-0.03em]">Claim a rank</h1>
        <p className="mt-2 text-[15px] text-fg-2">paste a StonkFun mint → sign → airdrop. that&apos;s the whole thing.</p>
      </section>
      <ClaimFlow initialMint={mint ?? ""} treasury={env.treasuryWallet} />
    </div>
  );
}
