"use client";
import { useEffect, useState } from "react";
import { listWallets, onWalletsChange, SUGGESTED_WALLETS, type WalletOption } from "@/lib/wallets";

/** Live list of installed Solana wallets (Wallet Standard + legacy injected). */
export function useWallets(): WalletOption[] {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  useEffect(() => {
    const refresh = () => setWallets(listWallets());
    refresh();
    const off = onWalletsChange(refresh);
    // Legacy providers don't announce themselves; look again a few times after load.
    const ids = [250, 1000, 2500].map((ms) => setTimeout(refresh, ms));
    return () => { off(); ids.forEach(clearTimeout); };
  }, []);
  return wallets;
}

export function WalletPicker({
  open, onClose, onPick, busyId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (w: WalletOption) => void;
  /** id of the wallet currently connecting (spinner state). */
  busyId?: string | null;
}) {
  const wallets = useWallets();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(7,16,19,0.7)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-[400px] p-5 fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="wallet-picker-title" className="font-semibold text-[16px]">pick a wallet</h2>
          <button
            className="size-7 rounded-full border border-line text-fg-2 hover:bg-elev-2 hover:text-fg transition-colors text-[13px] leading-none"
            onClick={onClose}
            aria-label="close"
          >
            ×
          </button>
        </div>
        <p className="text-[12.5px] text-fg-3 mt-1">you&apos;ll sign one message. no transactions, ever.</p>

        {wallets.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-1.5">
            {wallets.map((w) => {
              const busy = busyId === w.id;
              return (
                <li key={w.id}>
                  <button
                    className="w-full flex items-center gap-3 rounded-2xl border border-line bg-bg px-3 h-12 text-left hover:bg-elev-2 hover:border-line-strong transition-colors disabled:opacity-60"
                    onClick={() => onPick(w)}
                    disabled={!!busyId}
                  >
                    <WalletIcon wallet={w} />
                    <span className="flex-1 font-semibold text-[14px]">{w.name}</span>
                    {busy ? (
                      <span className="text-[12px] text-fg-3">connecting…</span>
                    ) : w.connected ? (
                      <span className="badge text-positive border-positive/30">detected</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-line bg-bg p-4 text-[13px]">
            <div className="font-semibold">no Solana wallet found</div>
            <p className="text-fg-2 mt-1">
              install one and reload — any wallet that speaks the Solana Wallet Standard will show up here.
              on mobile, open this page inside your wallet&apos;s browser.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_WALLETS.map((s) => (
                <a key={s.name} className="pill h-8" href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.name} ↗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function WalletIcon({ wallet, size = 28 }: { wallet: Pick<WalletOption, "name" | "icon">; size?: number }) {
  if (wallet.icon) {
    // Wallet Standard icons are data: URIs supplied by the extension; next/image can't optimise those.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={wallet.icon} alt="" width={size} height={size} className="rounded-lg shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="shrink-0 rounded-lg bg-elev-3 text-fg-2 font-semibold flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {wallet.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
