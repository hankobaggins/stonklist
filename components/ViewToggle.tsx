"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown } from "@/components/leaderboard/RankBadge";

export function ViewToggle() {
  const path = usePathname();
  const today = path.startsWith("/today");
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center rounded-full border border-line bg-elev-1 p-1">
        <Link
          href="/"
          className={`inline-flex items-center gap-1.5 rounded-full h-8 px-4 text-[13px] font-semibold transition-colors ${
            !today ? "bg-accent text-[#071013]" : "text-fg-2 hover:text-fg"
          }`}
        >
          <Crown /> All-time
        </Link>
        <Link
          href="/today"
          className={`inline-flex items-center gap-1.5 rounded-full h-8 px-4 text-[13px] font-semibold transition-colors ${
            today ? "bg-accent text-[#071013]" : "text-fg-2 hover:text-fg"
          }`}
        >
          <span className="live-dot" /> Today
        </Link>
      </div>
    </div>
  );
}
