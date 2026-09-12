import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron";
import { checkCrown } from "@/lib/crown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/crown — run the "new #1" check on demand (Authorization: Bearer $CRON_SECRET).
 * The same check also runs automatically after every price refresh and every deposit ingest.
 *   ?dry=1    → report what would be tweeted, write nothing
 *   ?force=1  → re-crown the current #1 and tweet even if unchanged (use for a manual re-announce)
 */
export async function GET(req: Request) {
  if (!verifyCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const result = await checkCrown({ dryRun: u.searchParams.get("dry") === "1", force: u.searchParams.get("force") === "1" });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
