import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getDeposits, getLeaderboard } from "@/lib/data";
import { claimPrice } from "@/lib/scoring";
import { feePct, usd } from "@/lib/format";

/**
 * GET /api/og/top — the "SYM is now #1 on stonklist" share card (1200×675, X post size).
 * Rendered from the live leaderboard; attach https://stonklist.lol/api/og/top to the tweet.
 * `?logo=0` skips the token image (useful if a gateway is flaky).
 */
export const runtime = "nodejs";
export const revalidate = 60;

const FONT_DIR = path.join(process.cwd(), "app/api/og/top/fonts");
async function fonts() {
  const [poppins600, poppins400, mono600, mono400] = await Promise.all([
    readFile(path.join(FONT_DIR, "Poppins-SemiBold.woff")),
    readFile(path.join(FONT_DIR, "Poppins-Regular.woff")),
    readFile(path.join(FONT_DIR, "GeistMono-SemiBold.ttf")),
    readFile(path.join(FONT_DIR, "GeistMono-Regular.ttf")),
  ]);
  return [
    { name: "Poppins", data: poppins600, weight: 600 as const, style: "normal" as const },
    { name: "Poppins", data: poppins400, weight: 400 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono600, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono400, weight: 400 as const, style: "normal" as const },
  ];
}

const C = {
  bg: "#071013", elev1: "#102127", line: "#1f4451", border: "#1e3239", borderStrong: "#2f4f58", borderAccent: "#3d6672",
  fg: "#f3f8f8", fg2: "#a4c5cf", fg3: "#7d949b", accent: "#69aac1", accentFg: "#71aabe", positive: "#5ee9b5", gold: "#f5c451",
};

function Mark() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="9" fill={C.elev1} stroke={C.borderAccent} />
      <path d="M7 21 L13 14 L17 18 L25 9" stroke={C.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9 H25 V14" stroke={C.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="24" r="1.6" fill={C.positive} />
    </svg>
  );
}

function Chip({ children, positive }: { children: string; positive?: boolean }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", height: 34, padding: "0 14px", borderRadius: 999, fontSize: 15, fontWeight: 600,
        border: `1px solid ${positive ? "rgba(94,233,181,.3)" : C.border}`,
        background: positive ? "rgba(94,233,181,.08)" : C.elev1,
        color: positive ? C.positive : C.fg2,
      }}
    >
      {children}
    </div>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantLogo = url.searchParams.get("logo") !== "0";
  const [board, fontData] = await Promise.all([getLeaderboard(), fonts()]);
  const top = board[0] ?? null;
  const depositCount = top ? (await getDeposits(top.mint, 1000)).length : 0;
  const take = top ? usd(claimPrice(top.score_usd)) : null;
  const symbol = top ? top.symbol.toUpperCase() : "nobody";
  const subtitle = top?.tagline ? `${top.name} · ${top.tagline}` : "Highest bag in the treasury takes #1. We hodl. You climb.";
  const headline = top ? `${symbol} is now ` : "nobody's sent anything yet. be first.";
  const headlineSize = symbol.length > 9 ? 72 : 92;

  const render = (withImage: boolean) =>
    new ImageResponse(
      (
        <div
          style={{
            width: "100%", height: "100%", display: "flex", position: "relative", background: C.bg, color: C.fg, fontFamily: "Poppins",
          }}
        >
          <svg width="1200" height="675" viewBox="0 0 1200 675" fill="none" style={{ position: "absolute", top: 0, left: 0 }}>
            <polyline
              points="-20,610 210,540 490,600 760,470 900,500 1120,330 1230,300"
              stroke={C.line} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
            />
          </svg>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "56px 64px" }}>
            {/* top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>
                <Mark />
                <span>stonklist.lol</span>
              </div>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 20px", borderRadius: 999, fontSize: 17, fontWeight: 600,
                  border: "1px solid rgba(245,196,81,.45)", background: "rgba(245,196,81,.10)", color: C.gold,
                }}
              >
                👑 new #1
              </div>
            </div>

            {/* hero */}
            <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
              {withImage && top?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={top.image_url} width={168} height={168} alt=""
                  style={{ width: 168, height: 168, borderRadius: 999, border: `3px solid ${C.borderStrong}`, objectFit: "cover", background: C.elev1 }}
                />
              ) : null}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: headlineSize, fontWeight: 600, letterSpacing: -3.5, lineHeight: 1.02 }}>
                  <span>{headline}</span>
                  {top ? <span style={{ color: C.gold, marginLeft: 20 }}>#1</span> : null}
                </div>
                <div style={{ marginTop: 10, fontSize: 30, color: C.fg2, letterSpacing: -0.3 }}>{subtitle.slice(0, 60)}</div>
              </div>
            </div>

            {/* score row */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 36 }}>
              <div style={{ fontFamily: "Geist Mono", fontSize: 88, fontWeight: 600, letterSpacing: -3, color: C.accentFg, lineHeight: 1 }}>
                {top ? usd(top.score_usd) : "$0"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8 }}>
                <div style={{ fontSize: 22, color: C.fg3 }}>in the treasury</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {top?.quote_symbol ? <Chip>{`paired with ${top.quote_symbol}`}</Chip> : null}
                  {top?.mode === "reward" ? <Chip positive>{`${feePct(top.transfer_fee_bps)} reward`}</Chip> : null}
                  {top ? <Chip>{`${depositCount} deposit${depositCount === 1 ? "" : "s"}`}</Chip> : null}
                </div>
              </div>
            </div>

            {/* footer */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "Geist Mono", fontSize: 17, color: C.fg3, letterSpacing: 0.5 }}>no ads · no refunds · not financial advice</div>
              <div
                style={{
                  display: "flex", alignItems: "center", height: 52, padding: "0 24px", borderRadius: 999, background: C.accent, color: C.bg, fontSize: 20, fontWeight: 600,
                }}
              >
                {take ? `take #1 for ~${take} →` : "be first →"}
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 675, fonts: fontData },
    );

  try {
    const buf = await render(wantLogo).arrayBuffer();
    return new Response(buf, { headers: { "content-type": "image/png", "cache-control": "public, max-age=60, s-maxage=60" } });
  } catch {
    return render(false);
  }
}
