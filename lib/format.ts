const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCentsFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function usd(v: number | null | undefined, opts: { cents?: boolean } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (opts.cents || Math.abs(v) < 100) return usdCentsFmt.format(v);
  return usdFmt.format(v);
}

/** $1.2K / $3.4M style */
export function usdCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return usd(v);
}

/** Price with sensible precision for sub-cent tokens. */
export function price(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (v >= 1) return `$${v.toFixed(2)}`;
  if (v >= 0.01) return `$${v.toFixed(4)}`;
  if (v >= 0.0001) return `$${v.toFixed(6)}`;
  return `$${v.toPrecision(3)}`;
}

export function compact(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(digits)}K`;
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(Math.abs(v) >= 100 ? 0 : 1)}%`;
}

export function shortAddr(a: string | null | undefined, n = 4): string {
  if (!a) return "—";
  if (a.length <= n * 2 + 1) return a;
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const s = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)} day${Math.floor(d) === 1 ? "" : "s"} ago`;
  const w = d / 7;
  if (w < 5) return `${Math.floor(w)} week${Math.floor(w) === 1 ? "" : "s"} ago`;
  const mo = d / 30;
  if (mo < 12) return `${Math.floor(mo)} month${Math.floor(mo) === 1 ? "" : "s"} ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function feePct(bps: number | null | undefined): string {
  if (!bps) return "0%";
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}
