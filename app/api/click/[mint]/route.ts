import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (hasSupabase) await supabaseAdmin().rpc("increment_clicks", { p_mint: mint });
  return new NextResponse(null, { status: 204 });
}
