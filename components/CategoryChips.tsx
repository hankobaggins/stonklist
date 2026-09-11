"use client";
import { useRouter, useSearchParams } from "next/navigation";

export function CategoryChips({ cats }: { cats: { key: string; label: string; count: number }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const active = sp.get("cat") ?? "all";
  const set = (k: string) => {
    const next = new URLSearchParams(sp.toString());
    if (k === "all") next.delete("cat");
    else next.set("cat", k);
    router.replace(`/?${next.toString()}`, { scroll: false });
  };
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      <button className="pill" data-active={active === "all"} onClick={() => set("all")}>
        All
      </button>
      {cats.map((c) => (
        <button key={c.key} className="pill" data-active={active === c.key} onClick={() => set(c.key)}>
          {c.label}
          <span className="mono text-[11px] text-fg-3">{c.count}</span>
        </button>
      ))}
    </div>
  );
}
