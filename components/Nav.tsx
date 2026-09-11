import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LiveCounter } from "@/components/LiveCounter";
import { NavLinks } from "@/components/NavLinks";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="stonklist.lol home">
          <Logo />
          <span className="font-semibold text-[16px] tracking-[-0.02em]">stonklist.lol</span>
        </Link>
        <LiveCounter />
        <div className="ml-auto flex items-center gap-1">
          <NavLinks />
          <Link href="/list" className="btn-primary h-9 px-4 text-[13px] ml-2 hidden sm:inline-flex">
            Claim rank
          </Link>
        </div>
      </div>
    </header>
  );
}
