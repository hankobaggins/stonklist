"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "All-time" },
  { href: "/today", label: "Today" },
  { href: "/stats", label: "Stats" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-0.5 text-[13.5px] font-medium">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-2.5 sm:px-3 h-9 items-center whitespace-nowrap rounded-full transition-colors ${
              active ? "text-fg bg-elev-2" : "text-fg-2 hover:text-fg hover:bg-elev-1"
            } ${l.href === "/stats" || l.href === "/about" || l.href === "/rules" ? "hidden md:inline-flex" : "inline-flex"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
