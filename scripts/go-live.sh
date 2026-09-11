#!/usr/bin/env bash
# stonklist.lol — one-shot go-live.
#   bash scripts/go-live.sh            # full run
#   bash scripts/go-live.sh --check    # only validate keys, change nothing
# Reads .env.local from the repo root. Secrets are never printed.
set -euo pipefail
cd "$(dirname "$0")/.."

CHECK_ONLY=false; [[ "${1:-}" == "--check" ]] && CHECK_ONLY=true
ok(){ printf "  \033[32m✔\033[0m %s\n" "$*"; }
bad(){ printf "  \033[31m✘\033[0m %s\n" "$*"; }
hdr(){ printf "\n\033[1m%s\033[0m\n" "$*"; }
die(){ bad "$*"; exit 1; }

[[ -f .env.local ]] || die ".env.local not found (copy .env.example and fill it in)"
# load .env.local, stripping trailing comments / whitespace / quotes
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*([A-Z0-9_]+)[[:space:]]*=(.*)$ ]] || continue
  k="${BASH_REMATCH[1]}"; v="${BASH_REMATCH[2]}"
  v="${v%%#*}"; v="$(printf '%s' "$v" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//')"
  export "$k=$v"
done < .env.local

PROD_VARS=(NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_TREASURY_WALLET NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY HELIUS_API_KEY HELIUS_WEBHOOK_SECRET CRON_SECRET STONKFUN_API_BASE)

hdr "1/6  env present"
for k in "${PROD_VARS[@]}"; do
  v="${!k:-}"; [[ -n "$v" ]] && ok "$k (${#v} chars)" || die "$k is empty in .env.local"
done
[[ "$NEXT_PUBLIC_SITE_URL" == "https://stonklist.lol" ]] || bad "NEXT_PUBLIC_SITE_URL is '$NEXT_PUBLIC_SITE_URL' (expected https://stonklist.lol)"
[[ "$SUPABASE_SERVICE_ROLE_KEY" == eyJ* ]] || bad "SUPABASE_SERVICE_ROLE_KEY doesn't look like a JWT (legacy service_role key is a JWT)"
[[ "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" == sb_publishable_* || "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" == eyJ* ]] || bad "publishable key should start sb_publishable_ (or be the legacy anon JWT)"
[[ ${#HELIUS_WEBHOOK_SECRET} -ge 32 && ${#CRON_SECRET} -ge 32 ]] || bad "webhook/cron secrets should be ≥32 chars (openssl rand -hex 32)"

hdr "2/6  keys actually work"
node -e '
const bs58=require("bs58").default||require("bs58");
const b=bs58.decode(process.env.NEXT_PUBLIC_TREASURY_WALLET);
if(b.length!==32){console.error("treasury pubkey is not a 32-byte base58 key");process.exit(1)}' && ok "treasury address is a valid Solana pubkey"

code=$(curl -s -o /tmp/sl_sb.json -w '%{http_code}' "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/listings?select=mint&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
case "$code" in
  200) ok "Supabase service-role key works and 'listings' table exists (migration applied)";;
  404) bad "Supabase reachable but 'listings' table missing → run supabase/migrations/0001_init.sql in the SQL editor"; MIGRATION_MISSING=1;;
  401|403) bad "Supabase rejected the service-role key (HTTP $code): $(head -c 300 /tmp/sl_sb.json)"
           printf "    url host: %s\n" "$(printf '%s' "$NEXT_PUBLIC_SUPABASE_URL" | sed 's#https\?://##')"
           die "see message above";;
  *) die "Supabase unreachable (HTTP $code) — check NEXT_PUBLIC_SUPABASE_URL: $(head -c 300 /tmp/sl_sb.json)";;
esac
code=$(curl -s -o /dev/null -w '%{http_code}' "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/leaderboard_all_time?select=mint&limit=1" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
[[ "$code" == 200 ]] && ok "publishable key can read leaderboard view (RLS ok)" || bad "publishable key → HTTP $code on leaderboard_all_time (RLS/view missing?)"

code=$(curl -s -o /tmp/sl_hel.json -w '%{http_code}' "https://api.helius.xyz/v0/webhooks?api-key=$HELIUS_API_KEY")
[[ "$code" == 200 ]] && ok "Helius API key valid ($(node -e 'console.log(JSON.parse(require("fs").readFileSync("/tmp/sl_hel.json")).length)') webhook(s) on the account)" || die "Helius rejected the API key (HTTP $code)"

code=$(curl -s -o /dev/null -w '%{http_code}' "$STONKFUN_API_BASE/pairs")
[[ "$code" == 200 ]] && ok "StonkFun API reachable" || bad "StonkFun API → HTTP $code"
rm -f /tmp/sl_sb.json /tmp/sl_hel.json

if $CHECK_ONLY; then hdr "check-only run finished"; exit 0; fi
[[ "${MIGRATION_MISSING:-}" == 1 ]] && die "apply the migration first, then re-run"

hdr "3/6  Vercel: link + env"
command -v vercel >/dev/null || { echo "  installing vercel CLI…"; npm i -g vercel >/dev/null; }
vercel whoami >/dev/null 2>&1 || vercel login
[[ -f .vercel/project.json || -f .vercel/repo.json ]] || vercel link --yes
ok "linked ($(ls .vercel/*.json | xargs -n1 basename | tr '\n' ' '))"
# replace, don't append: the vars that exist in Vercel today were saved with empty values.
FAILED=()
for k in "${PROD_VARS[@]}"; do
  for envt in production preview; do vercel env rm "$k" "$envt" --yes >/dev/null 2>&1 || true; done
  if printf '%s' "${!k}" | vercel env add "$k" production >/dev/null 2>/tmp/sl_err; then ok "set $k (production)"
  else bad "could not set $k: $(tr -d '\n' </tmp/sl_err | head -c 160)"; FAILED+=("$k"); fi
done
rm -f /tmp/sl_err
[[ ${#FAILED[@]} -eq 0 ]] || die "fix the variables above in the Vercel dashboard, then re-run"

hdr "4/6  Vercel: domain + deploy"
vercel domains add stonklist.lol >/dev/null 2>&1 && ok "stonklist.lol attached" || ok "stonklist.lol already attached (or needs DNS — see below)"
vercel domains add www.stonklist.lol >/dev/null 2>&1 || true
DEPLOY_URL=$(vercel --prod --yes 2>&1 | tee /dev/stderr | grep -Eo 'https://[a-z0-9.-]+\.vercel\.app' | tail -1 || true)
ok "deployed ${DEPLOY_URL:-(see output above)}"

hdr "5/6  Helius webhook → https://stonklist.lol/api/webhooks/helius"
pnpm -s register-webhook

hdr "6/6  sanity"
for u in "https://stonklist.lol" "https://www.stonklist.lol"; do
  printf "  %-30s → HTTP %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' -I "$u")"
done
printf "  cron/prices → %s\n" "$(curl -s -H "Authorization: Bearer $CRON_SECRET" https://stonklist.lol/api/cron/prices | head -c 200)"
printf "  webhook auth (bad secret should be 401) → HTTP %s\n" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Authorization: nope' -H 'content-type: application/json' -d '[]' https://stonklist.lol/api/webhooks/helius)"
echo
echo "done. send 1 token of any cheap StonkFun coin to $NEXT_PUBLIC_TREASURY_WALLET and watch 'Latest activity'."
