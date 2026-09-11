/**
 * Register (or update) the Helius Enhanced Webhook for the treasury wallet.
 *   pnpm register-webhook
 * Needs HELIUS_API_KEY, HELIUS_WEBHOOK_SECRET, NEXT_PUBLIC_TREASURY_WALLET, NEXT_PUBLIC_SITE_URL in .env.local
 */
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// no top-level await: package.json has no "type":"module", so tsx compiles this file as CJS.
async function main() {
  const { registerWebhook } = await import("../lib/helius");

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const treasury = process.env.NEXT_PUBLIC_TREASURY_WALLET;
  const secret = process.env.HELIUS_WEBHOOK_SECRET;
  if (!site || !treasury || !secret || !process.env.HELIUS_API_KEY) {
    console.error("missing env: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_TREASURY_WALLET, HELIUS_WEBHOOK_SECRET, HELIUS_API_KEY");
    process.exit(1);
  }
  const result = await registerWebhook({ webhookUrl: `${site}/api/webhooks/helius`, treasury, authHeader: secret });
  // never echo the auth header (it is HELIUS_WEBHOOK_SECRET)
  console.log("webhook registered:", { ...(result as Record<string, unknown>), authHeader: "<redacted>" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
