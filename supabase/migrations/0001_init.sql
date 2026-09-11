-- stonklist.lol — initial schema (CLAUDE.md §8)
-- Apply with: supabase db push   (or paste into the SQL editor)

create extension if not exists pg_cron;

create table if not exists listings (
  mint text primary key,
  pool text,
  name text not null,
  symbol text not null,
  image_url text,
  quote_mint text,
  quote_symbol text,
  quote_category text,
  quote_label text,
  quote_decimals int,
  mode text not null default 'standard' check (mode in ('standard','reward')),
  transfer_fee_bps int,
  status text,
  graduated_at timestamptz,
  created_on_stonkfun timestamptz,
  creator_wallet text,
  owner_wallet text,
  site_url text,
  tagline text check (char_length(tagline) <= 140),
  category text,
  balance numeric(38,9) not null default 0,
  price_usd numeric(30,12),
  price_change_24h numeric(12,4),
  market_cap_usd numeric(30,6),
  dividends_usd numeric(30,6) not null default 0,
  bag_usd numeric(30,6) generated always as (balance * coalesce(price_usd,0)) stored,
  score_usd numeric(30,6) generated always as (balance * coalesce(price_usd,0) + dividends_usd) stored,
  peak_score_usd numeric(30,6) not null default 0,
  first_deposit_at timestamptz,
  last_deposit_at timestamptz,
  clicks bigint not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_score_idx on listings (score_usd desc);
create index if not exists listings_quote_idx on listings (quote_mint);

create table if not exists deposits (
  id bigserial primary key,
  signature text not null,
  mint text not null references listings(mint),
  from_wallet text not null,
  amount numeric(38,9) not null,
  usd_at_deposit numeric(30,6),
  slot bigint,
  block_time timestamptz,
  source text not null default 'webhook',
  created_at timestamptz not null default now(),
  unique (signature, mint, from_wallet)
);
create index if not exists deposits_mint_time_idx on deposits (mint, block_time desc);
create index if not exists deposits_time_idx on deposits (block_time desc);

create table if not exists dividend_events (
  id bigserial primary key,
  signature text not null,
  quote_mint text not null,
  from_wallet text,
  amount numeric(38,9) not null,
  usd_at_receipt numeric(30,6),
  attributed_mint text references listings(mint),
  attribution text not null default 'unattributed' check (attribution in ('exact','estimated','unattributed')),
  block_time timestamptz,
  created_at timestamptz not null default now(),
  unique (signature, quote_mint, attributed_mint)
);
create index if not exists dividend_events_mint_idx on dividend_events (attributed_mint, block_time desc);

create table if not exists price_snapshots (
  mint text not null references listings(mint),
  price_usd numeric(30,12) not null,
  market_cap_usd numeric(30,6),
  score_usd numeric(30,6) not null,
  taken_at timestamptz not null default now(),
  primary key (mint, taken_at)
);

create table if not exists reconciliations (
  id bigserial primary key,
  mint text not null,
  das_balance numeric(38,9),
  ledger_balance numeric(38,9),
  delta numeric(38,9),
  taken_at timestamptz not null default now()
);

create table if not exists activity (
  id bigserial primary key,
  kind text not null check (kind in ('deposit','dividend','listed')),
  mint text not null,
  wallet text,
  amount numeric(38,9),
  usd numeric(30,6),
  created_at timestamptz not null default now()
);
create index if not exists activity_time_idx on activity (created_at desc);

create table if not exists raw_webhooks (
  id bigserial primary key,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  error text
);

create table if not exists ignored_transfers (
  id bigserial primary key,
  signature text not null,
  mint text not null,
  from_wallet text,
  amount numeric(38,9),
  reason text,
  received_at timestamptz not null default now(),
  unique (signature, mint)
);

-- Trigger: dividends_usd is a running total maintained on insert. Never recomputed from prices.
create or replace function bump_dividends() returns trigger language plpgsql as $$
begin
  if new.attributed_mint is not null and new.usd_at_receipt is not null then
    update listings
      set dividends_usd = dividends_usd + new.usd_at_receipt,
          updated_at = now()
      where mint = new.attributed_mint;
  end if;
  return new;
end $$;
drop trigger if exists dividend_events_bump on dividend_events;
create trigger dividend_events_bump after insert on dividend_events
  for each row execute function bump_dividends();

-- Trigger: deposits bump balance/first/last deposit.
create or replace function apply_deposit() returns trigger language plpgsql as $$
begin
  update listings
    set balance = balance + new.amount,
        first_deposit_at = coalesce(first_deposit_at, new.block_time, now()),
        last_deposit_at = greatest(coalesce(last_deposit_at, to_timestamp(0)), coalesce(new.block_time, now())),
        updated_at = now()
    where mint = new.mint;
  return new;
end $$;
drop trigger if exists deposits_apply on deposits;
create trigger deposits_apply after insert on deposits
  for each row execute function apply_deposit();

-- Trigger: keep peak_score_usd.
create or replace function track_peak() returns trigger language plpgsql as $$
begin
  if new.score_usd > new.peak_score_usd then new.peak_score_usd := new.score_usd; end if;
  return new;
end $$;
drop trigger if exists listings_peak on listings;
create trigger listings_peak before insert or update on listings
  for each row execute function track_peak();

-- Public views (hidden rows filtered)
create or replace view listings_public as
  select * from listings where hidden = false;

create or replace view leaderboard_all_time as
  select l.*, rank() over (order by score_usd desc, first_deposit_at asc nulls last, mint) as rank
  from listings l where hidden = false;

create or replace view leaderboard_today as
  with inflow as (
    select mint, sum(usd_at_deposit) as usd from deposits where block_time > now() - interval '24 hours' group by mint
    union all
    select attributed_mint as mint, sum(usd_at_receipt) from dividend_events
      where attributed_mint is not null and block_time > now() - interval '24 hours' group by attributed_mint
  )
  select l.mint, l.symbol, l.name, l.image_url, l.quote_label,
         coalesce(sum(i.usd),0) as today_usd,
         rank() over (order by coalesce(sum(i.usd),0) desc) as rank
  from listings l left join inflow i on i.mint = l.mint
  where l.hidden = false
  group by l.mint;

create or replace view activity_public as
  select a.*, l.symbol, l.image_url, l.quote_symbol
  from activity a join listings l on l.mint = a.mint
  where l.hidden = false;

create or replace view treasury_totals as
  select count(*) as listings,
         (select count(*) from deposits) as deposits,
         coalesce(sum(bag_usd),0) as bag_usd,
         coalesce(sum(dividends_usd),0) as dividends_usd,
         coalesce(sum(score_usd),0) as score_usd
  from listings where hidden = false;

-- RPC used by the click beacon
create or replace function increment_clicks(p_mint text) returns void language sql security definer as $$
  update listings set clicks = clicks + 1 where mint = p_mint;
$$;

-- RLS: anon can read public tables/views; all writes via service role.
alter table listings enable row level security;
alter table deposits enable row level security;
alter table dividend_events enable row level security;
alter table price_snapshots enable row level security;
alter table activity enable row level security;
alter table reconciliations enable row level security;
alter table raw_webhooks enable row level security;
alter table ignored_transfers enable row level security;

create policy "public read listings" on listings for select using (hidden = false);
create policy "public read deposits" on deposits for select using (true);
create policy "public read dividends" on dividend_events for select using (true);
create policy "public read snapshots" on price_snapshots for select using (true);
create policy "public read activity" on activity for select using (true);

grant execute on function increment_clicks(text) to anon;

-- Realtime for the live feed
alter publication supabase_realtime add table activity;
alter publication supabase_realtime add table listings;

-- /rewards cross-reference (lifetime payouts per reward coin, from StonkFun)
create table if not exists reward_stats (
  mint text primary key references listings(mint),
  quote_symbol text,
  distributed_tokens numeric(38,9),
  payout_count int,
  holder_count int,
  last_payout_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table reward_stats enable row level security;
create policy "public read reward_stats" on reward_stats for select using (true);

-- Used by the dividends cron when it back-fills a price after the insert trigger already ran.
create or replace function bump_dividends_usd(p_mint text, p_usd numeric) returns void language sql security definer as $$
  update listings set dividends_usd = dividends_usd + p_usd, updated_at = now() where mint = p_mint;
$$;
revoke execute on function bump_dividends_usd(text, numeric) from anon;
