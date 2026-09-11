"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * "N online" via Supabase Realtime presence (real count of open tabs).
 * When Supabase isn't configured we just show the live dot — no invented numbers.
 */
export function LiveCounter() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    const key = Math.random().toString(36).slice(2);
    const ch = sb.channel("presence:site", { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => {
      setOnline(Object.keys(ch.presenceState()).length);
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  return (
    <Link
      href="/stats"
      className="hidden sm:inline-flex items-center gap-2 rounded-full border border-line bg-elev-1 h-8 px-3 text-[12px] text-fg-2 hover:bg-elev-2 transition-colors"
    >
      <span className="live-dot" />
      {online !== null ? (
        <span className="text-positive font-semibold">{online} online</span>
      ) : (
        <span className="text-positive font-semibold">live</span>
      )}
      <span className="text-fg-3">·</span>
      <span className="font-semibold text-fg">stats→</span>
    </Link>
  );
}
