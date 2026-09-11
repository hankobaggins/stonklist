import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Poll endpoint for the claim flow: deposits for a mint since `since` (ms). */
export async function GET(req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const since = Number(new URL(req.url).searchParams.get("since") ?? 0);
  if (!hasSupabase) return NextResponse.json({ deposits: [] });
  const { data } = await supabaseServer()
    .from("deposits")
    .select("amount, usd_at_deposit, block_time, created_at")
    .eq("mint", mint)
    .gte("created_at", new Date(since).toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  return NextResponse.json({ deposits: (data ?? []).map((d) => ({ ...d, amount: Number(d.amount), usd_at_deposit: d.usd_at_deposit == null ? null : Number(d.usd_at_deposit) })) });
}
