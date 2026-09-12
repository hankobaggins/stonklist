# stonklist.lol

**Airdrop us your stonk. Top bag takes #1.**

A pay-to-rank leaderboard (outbid.lol mechanic) where projects climb by airdropping their
[StonkFun](https://www.stonkfun.xyz) token to one public treasury wallet. We hold. We track the
dividends reward-mode tokens pay the treasury. Score = bag (mark-to-market) + dividends received.

Product rules, design tokens, data model and API details live in [`CLAUDE.md`](./CLAUDE.md). Read it first.

## Run it in 60 seconds (demo mode)

```bash
pnpm install
pnpm dev          # http://localhost:3000 — real StonkFun tokens, invented balances
pnpm test         # scoring + webhook-parsing unit tests
pnpm build
```

With no Supabase env the app serves in-memory mock data (`lib/mock.ts`) so every page renders.
The yellow "demo mode" banner disappears once Supabase is configured.

## Go live — SETUP

Everything below is copy-paste. Order matters only for step 6.

### 1. Supabase (≈5 min)

1. Create a project at supabase.com → Project Settings → API. Copy **URL**, **publishable key** (`sb_publishable_…`), and the legacy **service_role key**.
2. SQL editor → paste `supabase/migrations/0001_init.sql` → Run. (Optionally `supabase/seed.sql` for 3 demo rows.)
3. Database → Replication → make sure `activity` and `listings` are in the `supabase_realtime` publication (the migration adds them; confirm).

### 2. Helius (≈3 min)

1. helius.dev → new project (free tier is enough) → copy the **API key**.
2. Generate a webhook secret: `openssl rand -hex 32` → this is `HELIUS_WEBHOOK_SECRET`.

### 3. Treasury wallet

Create a fresh Solana wallet **outside this codebase** (hardware wallet or a Phantom account used for nothing else).
Only its **public key** goes into `NEXT_PUBLIC_TREASURY_WALLET`. The private key is never stored anywhere near this repo, Vercel, or Supabase.

### 4. Env

Copy `.env.example` → `.env.local` and fill it in. `CRON_SECRET` = another `openssl rand -hex 32`.

### 5. Vercel

1. Push this repo to GitHub, import it in Vercel (framework auto-detects Next.js, package manager pnpm).
2. Add every var from `.env.local` to **Production** (and Preview if you want previews to hit the real DB).
3. Deploy. `vercel.json` registers the three crons: prices every 5 min, dividends every 15 min, reconcile hourly.
4. Domain: Project → Settings → Domains → add `stonklist.lol` (+ `www` with redirect to apex), then at the registrar either
   switch nameservers to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`, or add `A @ → 76.76.21.21` and `CNAME www → cname.vercel-dns.com`.
   Full detail in `CLAUDE.md` §11.1.

### 6. Register the Helius webhook (after the site has a public URL)

```bash
pnpm register-webhook     # reads .env.local; creates/updates the Enhanced Webhook on the treasury address
```

Helius will now POST every transfer touching the treasury to `/api/webhooks/helius` with your secret in the
`Authorization` header. Send 1 token of any cheap StonkFun coin to the treasury and watch it appear in
"Latest activity" within ~10 s.

### 7. Sanity checks

- `curl -I https://stonklist.lol` → 200, `server: Vercel`
- `curl -H "Authorization: Bearer $CRON_SECRET" https://stonklist.lol/api/cron/prices` → `{ ok: true, updated: N }`
- `/stats` shows the treasury address; footer shows its short form.

### 8. "New #1" tweets (optional, ≈2 min)

Every price refresh and every deposit runs `checkCrown()` (`lib/crown.ts`). When the top mint changes it records a
row in `crownings`, drops a "👑 $SYM took #1" line into Latest activity, and posts the `/api/og/top` card to X through
SocialBu.

1. Apply `supabase/migrations/0003_crownings.sql` in the SQL editor.
2. SocialBu → Settings → API for Developers → copy the token into `SOCIALBU_API_TOKEN`. `SOCIALBU_ACCOUNT_ID` is the
   stonklist.lol X account in SocialBu (202426). Push env with `scripts/go-live.sh`.
3. First run only seeds the current king (no tweet). Preview a tweet without writing anything:
   `curl -H "Authorization: Bearer $CRON_SECRET" "https://stonklist.lol/api/cron/crown?dry=1"`.
   `?force=1` re-crowns and tweets the current #1 (manual re-announce).

Guards: challenger must lead #2 by `CROWN_MIN_LEAD_PCT` (2) and there is at most one tweet per `CROWN_COOLDOWN_MIN`
(30). Without a SocialBu token the crowning is still recorded (`post_error = "socialbu not configured"`).

## What's where

```
app/                 pages + API routes (App Router)
  api/webhooks/helius   inbound transfers → deposits / dividend_events / ignored
  api/cron/prices       StonkFun price refresh + price_snapshots (every 5 min)
  api/cron/dividends    back-fill dividend USD, /rewards cross-reference (15 min)
  api/cron/reconcile    replay failed webhooks, DAS balance resync (hourly)
  api/listings          POST register a listing (wallet-signed message)
  api/preview/[mint]    live StonkFun eligibility check for the claim flow
  api/og/[mint]         OG share card
components/          UI (leaderboard rows, claim flow, activity feed, …)
lib/                 stonkfun client · scoring (pure, tested) · helius · ingest · data layer · mock
supabase/            migrations + seed
scripts/             register-helius-webhook.ts
```

## How deposits become rank

1. Helius webhook delivers the transfer → `lib/ingest.ts`.
2. Listed mint → `deposits` row (trigger bumps `listings.balance`, first/last deposit) + activity row.
3. Quote asset of a reward-mode listing → `dividend_events` row, attributed exactly (one listing uses that quote)
   or pro-rata by `transferFee.bps × balance` (flagged *estimated*). Trigger adds `usd_at_receipt` to `listings.dividends_usd` — frozen forever.
4. Unknown mint that *is* a StonkFun token → auto-listed with no owner (anyone can register it later by signing). Anything else → `ignored_transfers`.
5. `score_usd` is a generated column: `balance × price_usd + dividends_usd`. The prices cron re-marks it every 5 minutes.

## Deviations from CLAUDE.md worth knowing

- Next.js **16** (current at scaffold time) rather than 15. Same App Router API surface.
- Poppins is loaded via a `<link>` tag instead of `next/font/google` so builds work without outbound network; swap if you like.
- No shadcn dependency — the handful of primitives (`.pill`, `.btn-primary`, `.input`, `.card`, `.badge`) live in `globals.css` with the §3 tokens.
- Wallet signing uses the injected provider (`window.phantom.solana` / `window.solana` / `window.solflare`) directly instead of `@solana/wallet-adapter`, which keeps the bundle small. Same signed-message flow.
- "N online" in the nav is real (Supabase Realtime presence) once Supabase is configured; otherwise it just shows "live". No invented visitor counts.

## Changelog

- **2026-09-12 — "new #1" share card + auto-tweet.** `/api/og/top` (1200×675 X card of the current king),
  `crownings` table + `claim_crown()` (advisory-locked, so cron and webhook can't double-post), `lib/crown.ts`
  detection with lead/cooldown guards, `lib/socialbu.ts` (upload_media_by_url → posts → publish), `/api/cron/crown`
  for dry runs and manual re-announces, "crowned" rows in Latest activity.

- **2026-09-11 — Phase 0–3 in one pass.** Scaffold, design system, schema, read-only leaderboard with mock data,
  listing pages, OG cards, claim flow with wallet signing, Helius webhook + ingest, three crons, stats/rules/about.
  Remaining for Phase 4: GMGN holder breakdown, moderation UI, analytics, title-bar ticker.
