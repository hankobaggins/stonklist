import { env, hasSupabase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLeaderboard } from "@/lib/data";
import { claimPrice } from "@/lib/scoring";
import { usd } from "@/lib/format";
import { hasSocialBu, publishNow, uploadMediaByUrl } from "@/lib/socialbu";
import type { RankedListing } from "@/lib/types";

/**
 * "New #1" detection + announcement.
 *
 * Called after anything that can move scores (price cron, deposit ingest). Compares the live
 * leaderboard with the last row in `crownings`; when the top mint changed, records the crowning
 * (via `claim_crown`, which takes an advisory lock so cron + webhook can't both tweet), then posts
 * the `/api/og/top` card through SocialBu.
 *
 * Guards against spam when two bags are neck and neck:
 *  - the challenger must lead #2 by CROWN_MIN_LEAD_PCT (default 2%)
 *  - at most one crowning per CROWN_COOLDOWN_MIN (default 30 min)
 * The very first run only seeds the table (no tweet), so a fresh deploy never announces stale news.
 */
export interface CrownResult {
  ok: boolean;
  changed: boolean;
  king: string | null;
  reason?: string;
  postId?: string | null;
  error?: string;
  content?: string;
}

interface CrownRow { id: number; mint: string; symbol: string; crowned_at: string }

export function tweetText(top: RankedListing, prev: { symbol: string } | null): string {
  const take = usd(claimPrice(top.score_usd));
  // No cashtags: "Name - SYMBOL" (symbol upper-cased), then the contract address on its own line.
  const who = `${top.name} - ${top.symbol.toUpperCase()}`;
  const lines = [
    "👑 new #1 on stonklist",
    "",
    `${who} takes the top slot with ${usd(top.score_usd)} in the treasury.${prev ? ` ${prev.symbol.toUpperCase()} dethroned.` : ""}`,
    `CA: ${top.mint}`,
    "",
    `take #1 for ~${take}. we hodl. you climb.`,
  ];
  return lines.join("\n");
}

export async function checkCrown(opts: { dryRun?: boolean; force?: boolean } = {}): Promise<CrownResult> {
  if (!hasSupabase) return { ok: true, changed: false, king: null, reason: "no supabase" };
  const db = supabaseAdmin();

  const board = await getLeaderboard();
  const top = board[0];
  if (!top || top.score_usd <= 0) return { ok: true, changed: false, king: null, reason: "empty board" };

  const { data: lastRows } = await db
    .from("crownings")
    .select("id,mint,symbol,crowned_at")
    .order("crowned_at", { ascending: false })
    .limit(1);
  const last = (lastRows?.[0] as CrownRow | undefined) ?? null;

  if (last && last.mint === top.mint && !opts.force) return { ok: true, changed: false, king: top.symbol };

  // anti-flap guards (skipped with force)
  if (!opts.force && last) {
    const second = board[1];
    const minLead = env.crownMinLeadPct / 100;
    if (second && top.score_usd < second.score_usd * (1 + minLead)) {
      return { ok: true, changed: false, king: last.symbol, reason: `lead under ${env.crownMinLeadPct}% over ${second.symbol.toUpperCase()}` };
    }
    const ageMin = (Date.now() - new Date(last.crowned_at).getTime()) / 60000;
    if (ageMin < env.crownCooldownMin) {
      return { ok: true, changed: false, king: last.symbol, reason: `cooldown (${Math.round(ageMin)} of ${env.crownCooldownMin} min)` };
    }
  }

  const content = tweetText(top, last);
  if (opts.dryRun) return { ok: true, changed: true, king: top.symbol, reason: "dry run", content };

  // seed on first run: record who is king, but don't tweet history
  const seeding = !last && !opts.force;

  const { data: newId, error: claimErr } = await db.rpc("claim_crown", {
    p_mint: top.mint, p_symbol: top.symbol, p_score: top.score_usd, p_prev_mint: last?.mint ?? null, p_prev_symbol: last?.symbol ?? null,
  });
  if (claimErr) return { ok: false, changed: false, king: top.symbol, error: claimErr.message };
  if (newId == null) return { ok: true, changed: false, king: top.symbol, reason: "raced: already crowned" };
  if (seeding) return { ok: true, changed: true, king: top.symbol, reason: "seeded, no tweet" };

  if (!hasSocialBu) {
    await db.from("crownings").update({ post_error: "socialbu not configured" }).eq("id", newId);
    return { ok: true, changed: true, king: top.symbol, reason: "socialbu not configured", content };
  }

  try {
    // the card renders from the live board; ?v= busts the CDN cache so we never post the old king
    const cardUrl = `${env.siteUrl}/api/og/top?v=${encodeURIComponent(top.mint)}&t=${Date.now()}`;
    const token = await uploadMediaByUrl(cardUrl, `stonklist-number-one-${top.symbol.toLowerCase()}.png`);
    const { postId } = await publishNow(content, [token]);
    await db.from("crownings").update({ announced: true, post_id: postId }).eq("id", newId);
    return { ok: true, changed: true, king: top.symbol, postId, content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("crownings").update({ post_error: msg.slice(0, 500) }).eq("id", newId);
    return { ok: false, changed: true, king: top.symbol, error: msg, content };
  }
}
