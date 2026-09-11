"use client";
import { QRCodeSVG } from "qrcode.react";
import { CopyButton } from "@/components/CopyButton";

export function DepositInstructions({
  treasury,
  symbol,
  mint,
  compact = false,
}: {
  treasury: string;
  symbol: string;
  mint: string;
  compact?: boolean;
}) {
  if (!treasury)
    return (
      <div className="card p-5 text-[13px] text-fg-3">
        treasury wallet not configured yet. set <span className="mono">NEXT_PUBLIC_TREASURY_WALLET</span>.
      </div>
    );
  const solanaPay = `solana:${treasury}?spl-token=${mint}&label=stonklist.lol&message=airdrop%20${encodeURIComponent(symbol)}`;
  return (
    <div className="card p-5 flex flex-col sm:flex-row gap-5 items-start">
      {!compact ? (
        <div className="rounded-2xl bg-white p-2 shrink-0">
          <QRCodeSVG value={solanaPay} size={128} bgColor="#ffffff" fgColor="#071013" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[15px]">Send ${symbol} to the treasury</h3>
        <p className="text-[13px] text-fg-2 mt-1">
          Any amount, from any wallet. It lands in the bag in ~10s. Deposits are final. We hold forever.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-[20px] border border-line-strong bg-bg px-3 h-11">
          <span className="mono text-[12px] sm:text-[13px] truncate flex-1 text-fg">{treasury}</span>
          <CopyButton text={treasury} />
        </div>
        <p className="mt-2 text-[11.5px] text-fg-3">
          QR is a Solana Pay link pre-filled with this mint. Only ${symbol} counts toward this listing; other StonkFun tokens
          create their own listing; anything else is ignored.
        </p>
      </div>
    </div>
  );
}
