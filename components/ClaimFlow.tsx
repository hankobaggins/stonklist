"use client";
import { useCallback, useEffect, useState } from "react";
import bs58 from "bs58";
import Link from "next/link";
import { TokenImage } from "@/components/TokenImage";
import { QuoteChip, ModeChip } from "@/components/Chips";
import { DepositInstructions } from "@/components/DepositInstructions";
import { extractMint, listingMessage } from "@/lib/sign";
import { price, shortAddr, usd, usdCompact } from "@/lib/format";
import { WalletIcon, WalletPicker } from "@/components/WalletPicker";
import { isUserReject, lastWalletId, listWallets, rememberWallet, walletErrMsg, type WalletOption } from "@/lib/wallets";

type Preview = {
  mint: string; name: string; symbol: string; imageUrl: string | null;
  quote: { symbol: string; category: string; categoryLabel: string };
  mode: "standard" | "reward"; transferFeeBps: number | null;
  priceUsd: number | null; marketCapUsd: number | null;
  alreadyListed: boolean; currentScore: number; topScore: number; claimPrice: number;
};

export function ClaimFlow({ initialMint, treasury }: { initialMint: string; treasury: string }) {
  const [mint, setMint] = useState(initialMint);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [wallet, setWallet] = useState<string | null>(null);          // base58 address
  const [walletObj, setWalletObj] = useState<WalletOption | null>(null); // which wallet signed in
  const [pickerOpen, setPickerOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detected, setDetected] = useState<{ amount: number; usd: number | null } | null>(null);

  const check = useCallback(async (raw: string) => {
    const m = extractMint(raw);
    if (!m || m.length < 32) return;
    setChecking(true);
    try {
      const r = await fetch(`/api/preview/${m}`);
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "not a StonkFun token"); setPreview(null); }
      else { setErr(null); setPreview(j); }
    } catch { setErr("couldn't reach StonkFun. try again."); setPreview(null); }
    finally { setChecking(false); }
  }, []);

  // Auto-check a mint arriving via ?mint= (async, so state updates happen in callbacks).
  useEffect(() => {
    if (!initialMint) return;
    const id = setTimeout(() => void check(initialMint), 0);
    return () => clearTimeout(id);
  }, [initialMint, check]);

  /** Open the picker, or reconnect straight to the wallet used last time if it's still installed. */
  const connect = () => {
    const last = lastWalletId();
    const w = last ? listWallets().find((x) => x.id === last && x.connected) : undefined;
    if (w) void pick(w); else setPickerOpen(true);
  };

  const pick = async (w: WalletOption) => {
    setConnectingId(w.id);
    try {
      const addr = await w.connect();
      setWallet(addr);
      setWalletObj(w);
      rememberWallet(w.id);
      setPickerOpen(false);
      setErr(null);
    } catch (e) {
      setErr(isUserReject(e) ? "wallet connection cancelled." : `${w.name}: ${walletErrMsg(e)}`);
      setPickerOpen(false);
    } finally { setConnectingId(null); }
  };

  const disconnect = async () => {
    try { await walletObj?.disconnect(); } catch { /* best effort */ }
    setWallet(null); setWalletObj(null); rememberWallet(null);
  };

  const register = async () => {
    if (!walletObj || !wallet || !preview) return;
    setSubmitting(true); setErr(null);
    try {
      const ts = Date.now();
      const msg = listingMessage(preview.mint, ts);
      const signature = await walletObj.signMessage(new TextEncoder().encode(msg));
      const r = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint: preview.mint, ts, wallet, signature: bs58.encode(signature), siteUrl: siteUrl || null, tagline: tagline || null }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error ?? "registration failed"); return; }
      setStep(3);
    } catch (e) {
      setErr(isUserReject(e) ? "signature cancelled." : `${walletObj.name}: ${walletErrMsg(e)}`);
    } finally { setSubmitting(false); }
  };

  // Poll for the first deposit after registration.
  useEffect(() => {
    if (step !== 3 || !preview || detected) return;
    const since = Date.now();
    const id = setInterval(async () => {
      const r = await fetch(`/api/deposits/${preview.mint}?since=${since}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { deposits: { amount: number; usd_at_deposit: number | null }[] };
      if (j.deposits.length > 0) setDetected({ amount: j.deposits[0].amount, usd: j.deposits[0].usd_at_deposit });
    }, 5000);
    return () => clearInterval(id);
  }, [step, preview, detected]);

  return (
    <div className="mx-auto max-w-[720px]">
      <Steps step={step} />

      {step === 1 ? (
        <section className="mt-6">
          <label className="text-[13px] font-medium text-fg-2">StonkFun mint address</label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              className="input w-full sm:flex-1 mono text-[13px]"
              value={mint}
              onChange={(e) => setMint(extractMint(e.target.value))}
              onBlur={() => void check(mint)}
              placeholder="e.g. 8RVBk8vxLiUHueLUW1f4izFVqN3nWippLhkohKg6EGkS"
              spellCheck={false}
            />
            <button className="btn-secondary" onClick={() => void check(mint)} disabled={checking}>
              {checking ? "checking…" : "Check"}
            </button>
          </div>
          {err ? <p className="mt-3 text-[13px] text-negative">{err}</p> : null}
          {preview ? (
            <div className="card mt-4 p-5">
              <div className="flex items-center gap-4">
                <TokenImage src={preview.imageUrl} alt={preview.symbol} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[16px]"><span className="mono">${preview.symbol}</span> <span className="text-fg-2 font-medium">· {preview.name}</span></div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <QuoteChip symbol={preview.quote.symbol} label={preview.quote.categoryLabel} category={preview.quote.category} />
                    <ModeChip mode={preview.mode} bps={preview.transferFeeBps} />
                    <span className="badge mono">{price(preview.priceUsd)}</span>
                    <span className="badge mono">mcap {usdCompact(preview.marketCapUsd)}</span>
                  </div>
                </div>
                <span className="text-positive text-[12px] font-semibold shrink-0">✓ eligible</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-2xl bg-bg border border-line p-3">
                  <div className="text-fg-3 text-[11.5px]">status here</div>
                  <div className="font-semibold">{preview.alreadyListed ? `listed · ${usd(preview.currentScore)}` : "not listed yet"}</div>
                </div>
                <div className="rounded-2xl bg-bg border border-line p-3">
                  <div className="text-fg-3 text-[11.5px]">to take #1</div>
                  <div className="font-semibold mono text-accent-fg">~{usd(preview.claimPrice)}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {preview.alreadyListed ? (
                  <Link href={`/t/${preview.mint}`} className="btn-primary">Already listed · add to the bag</Link>
                ) : (
                  <button className="btn-primary" onClick={() => setStep(2)}>Continue</button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {step === 2 && preview ? (
        <section className="mt-6 card p-5">
          <h2 className="font-semibold text-[16px]">Prove you own a wallet, add your links</h2>
          <p className="text-[13px] text-fg-2 mt-1">
            You sign a message. Nothing is sent on-chain and we never ask for keys. The signer becomes the listing owner
            (can edit the tagline later). Anyone can still deposit.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {wallet && walletObj ? (
              <>
                <span className="badge h-9 px-3 gap-2 text-[12.5px]">
                  <WalletIcon wallet={walletObj} size={18} />
                  <span className="font-medium">{walletObj.name}</span>
                  <span className="mono text-fg-3">{shortAddr(wallet, 6)}</span>
                </span>
                <button className="pill h-8" onClick={() => setPickerOpen(true)}>change</button>
                <button className="pill h-8" onClick={() => void disconnect()}>disconnect</button>
              </>
            ) : (
              <button className="btn-secondary" onClick={connect}>Connect wallet</button>
            )}
          </div>
          <WalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(w) => void pick(w)} busyId={connectingId} />
          <div className="mt-4 grid gap-3">
            <div>
              <label className="text-[12.5px] text-fg-2">Site URL (optional)</label>
              <input className="input mt-1" placeholder="https://" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-[12.5px] text-fg-2">Tagline (≤140, optional)</label>
              <input className="input mt-1" maxLength={140} placeholder="one cheeky line" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
          </div>
          {err ? <p className="mt-3 text-[13px] text-negative">{err}</p> : null}
          <div className="mt-5 flex gap-2">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-primary" disabled={!wallet || submitting} onClick={register}>
              {submitting ? "signing…" : "Sign & register"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 && preview ? (
        <section className="mt-6 flex flex-col gap-4">
          <div className="card p-5 text-center">
            <div className="text-[13px] text-positive font-semibold">listed ✓</div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] mt-1">now airdrop the treasury</h2>
            <p className="text-[13px] text-fg-2 mt-1">send any amount of ${preview.symbol}. we detect it in ~10s.</p>
          </div>
          <DepositInstructions treasury={treasury} symbol={preview.symbol} mint={preview.mint} />
          <div className="card p-5 text-center">
            {detected ? (
              <>
                <Confetti />
                <div className="text-[20px] font-semibold text-positive">🎉 got it</div>
                <p className="text-[13px] text-fg-2 mt-1">
                  {detected.amount.toLocaleString()} ${preview.symbol} landed ({usd(detected.usd)}).
                </p>
                <Link href={`/t/${preview.mint}`} className="btn-primary mt-4">See your listing</Link>
              </>
            ) : (
              <p className="text-[13px] text-fg-3"><span className="live-dot mr-2" />waiting for the first deposit…</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const items = ["Paste mint", "Sign", "Deposit"];
  return (
    <ol className="flex items-center justify-center gap-2">
      {items.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`pill h-8 ${i + 1 <= step ? "" : "opacity-60"}`} data-active={i + 1 === step}>
            <span className="mono">{i + 1}</span> {s}
          </span>
          {i < items.length - 1 ? <span className="text-fg-3">—</span> : null}
        </li>
      ))}
    </ol>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute top-0 size-2 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: i % 3 === 0 ? "var(--positive)" : i % 3 === 1 ? "var(--accent)" : "var(--gold)",
            animation: `fall ${2 + (i % 5) * 0.4}s linear ${(i % 7) * 0.15}s forwards`,
          }}
        />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(110vh) rotate(540deg); opacity: 0.2 } }`}</style>
    </div>
  );
}
