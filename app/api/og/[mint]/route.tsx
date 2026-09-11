import { ImageResponse } from "next/og";
import { getListing } from "@/lib/data";
import { usd, usdCompact } from "@/lib/format";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(_: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const l = await getListing(mint);
  const title = l ? `#${l.rank} $${l.symbol}` : "stonklist.lol";
  const score = l ? usd(l.score_usd) : "";
  const divs = l && l.dividends_usd > 0 ? `+${usdCompact(l.dividends_usd)} divs` : "";
  const render = (withImage: boolean) => new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          background: "#071013", color: "#f3f8f8", padding: 64, fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: "#a4c5cf" }}>
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
            <rect x="1" y="1" width="30" height="30" rx="9" fill="#102127" stroke="#3d6672" />
            <path d="M7 21 L13 14 L17 18 L25 9" stroke="#69aac1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 9 H25 V14" stroke="#69aac1" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="24" r="1.6" fill="#5ee9b5" />
          </svg>
          stonklist.lol · airdrop us your stonk
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {withImage && l?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.image_url} width={160} height={160} style={{ borderRadius: 999, border: "2px solid #2f4f58" }} alt="" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -3, color: l?.rank === 1 ? "#f5c451" : "#f3f8f8" }}>{title}</div>
            {l ? <div style={{ fontSize: 36, color: "#a4c5cf" }}>{`${l.name}${l.tagline ? ` — ${l.tagline}` : ""}`.slice(0, 58)}</div> : null}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: "#71aabe", letterSpacing: -2 }}>{score}</div>
          <div style={{ fontSize: 32, color: "#7d949b" }}>in the treasury</div>
          {divs ? <div style={{ fontSize: 32, color: "#5ee9b5" }}>{divs}</div> : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  try {
    const res = render(true);
    // force the body to materialize so an image fetch failure is caught here
    const buf = await res.arrayBuffer();
    return new Response(buf, { headers: { "content-type": "image/png", "cache-control": "public, max-age=300" } });
  } catch {
    return render(false);
  }
}
