"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Activity } from "@/lib/types";
import { supabaseBrowser } from "@/lib/supabase/client";
import { compact, shortAddr, timeAgo, usdCompact } from "@/lib/format";
import { TokenImage } from "@/components/TokenImage";

export function ActivityFeed({ initial }: { initial: Activity[] }) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    const ch = sb
      .channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity" }, async (payload) => {
        const row = payload.new as Activity;
        // enrich with symbol/image from the public view
        const { data } = await sb.from("listings_public").select("symbol,image_url,quote_symbol").eq("mint", row.mint).maybeSingle();
        setItems((prev) => [{ ...row, ...(data ?? {}) }, ...prev].slice(0, 30));
      })
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  if (items.length === 0)
    return <p className="text-[13px] text-fg-3 px-1">nobody&apos;s sent anything yet. be first.</p>;

  return (
    <ul className="flex flex-col">
      {items.map((a) => (
        <li key={`${a.kind}-${a.id}`} className="fade-in-up flex items-center gap-2.5 py-2 border-b border-line last:border-0">
          <TokenImage src={a.image_url} alt={a.symbol ?? "?"} size={26} />
          <div className="min-w-0 flex-1 text-[12.5px] leading-tight">
            {a.kind === "deposit" ? (
              <>
                <span className="mono text-fg-2">{shortAddr(a.wallet)}</span> airdropped{" "}
                <span className="mono text-fg">{compact(a.amount)} ${a.symbol}</span>
              </>
            ) : a.kind === "dividend" ? (
              <>
                <span className="text-positive font-medium">dividend</span> paid to{" "}
                <Link href={`/t/${a.mint}`} className="mono text-fg hover:text-accent-fg">${a.symbol}</Link>
                <span className="text-fg-3"> in {a.quote_symbol}</span>
              </>
            ) : a.kind === "crowned" ? (
              <>
                <span className="text-gold font-medium">👑</span>{" "}
                <Link href={`/t/${a.mint}`} className="mono text-fg hover:text-accent-fg">${a.symbol}</Link> took #1
              </>
            ) : (
              <>
                <Link href={`/t/${a.mint}`} className="mono text-fg hover:text-accent-fg">${a.symbol}</Link> got listed
              </>
            )}
            <div className="text-[11px] text-fg-3">{timeAgo(a.created_at)}</div>
          </div>
          {a.usd != null ? (
            <span className={`mono text-[12.5px] font-semibold ${a.kind === "dividend" ? "text-positive" : "text-fg"}`}>
              {a.kind === "dividend" ? "+" : ""}
              {usdCompact(a.usd)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
