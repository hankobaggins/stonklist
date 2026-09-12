-- 0003: crownings — every time a new mint takes #1 we record it here and (optionally) tweet it.
-- The latest row is "the current king"; app code compares the live leaderboard against it.
create table if not exists crownings (
  id bigserial primary key,
  mint text not null references listings(mint),
  symbol text not null,
  score_usd numeric(30,6) not null,
  prev_mint text references listings(mint),
  prev_symbol text,
  crowned_at timestamptz not null default now(),
  announced boolean not null default false,      -- true once the tweet went out
  post_id text,                                   -- SocialBu post id
  post_error text
);
create index if not exists crownings_time_idx on crownings (crowned_at desc);

alter table crownings enable row level security;
create policy "crownings are public" on crownings for select using (true);

-- "crowned" shows up in the Latest activity rail.
alter table activity drop constraint if exists activity_kind_check;
alter table activity add constraint activity_kind_check check (kind in ('deposit','dividend','listed','crowned'));

-- only one crowning may be in flight at a time (prevents double-tweets from concurrent cron + webhook)
create or replace function claim_crown(p_mint text, p_symbol text, p_score numeric, p_prev_mint text, p_prev_symbol text)
returns bigint language plpgsql security definer as $$
declare
  cur text;
  new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('crownings'));
  select mint into cur from crownings order by crowned_at desc, id desc limit 1;
  if cur is not distinct from p_mint then
    return null;  -- already king
  end if;
  insert into crownings (mint, symbol, score_usd, prev_mint, prev_symbol)
  values (p_mint, p_symbol, p_score, p_prev_mint, p_prev_symbol)
  returning id into new_id;
  insert into activity (kind, mint, usd) values ('crowned', p_mint, p_score);
  return new_id;
end $$;
revoke execute on function claim_crown(text, text, numeric, text, text) from anon, authenticated;
