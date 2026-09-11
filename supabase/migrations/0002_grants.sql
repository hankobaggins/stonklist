-- 0002: role grants. 0001 relied on Supabase's default privileges, which did not apply when
-- it was run from the SQL editor: service_role got "permission denied for table listings" (42501).
-- anon/authenticated read through RLS (policies in 0001); service_role does all writes.
grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon, authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- keep it that way for tables/sequences/functions created by later migrations
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- 0001 deliberately kept this off anon
revoke execute on function bump_dividends_usd(text, numeric) from anon, authenticated;
