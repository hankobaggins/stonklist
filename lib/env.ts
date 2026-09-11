/** Central env access. Public values are safe on the client; the rest are server-only. */
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Publishable key (sb_publishable_…) is the modern anon key; legacy anon JWT still accepted.
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // server only
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  heliusApiKey: process.env.HELIUS_API_KEY ?? "",
  heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  gmgnApiKey: process.env.GMGN_API_KEY ?? "",
};

/** True when Supabase is configured; otherwise the app runs on in-memory mock data. */
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasTreasury = Boolean(env.treasuryWallet);
