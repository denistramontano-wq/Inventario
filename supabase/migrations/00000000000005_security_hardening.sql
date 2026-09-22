-- Pin search_path on all SECURITY DEFINER / trigger functions to close the
-- "search_path hijacking" class of privilege-escalation bug flagged by the
-- Supabase linter (function_search_path_mutable).
alter function public.is_household_member(uuid) set search_path = public, pg_temp;
alter function public.handle_new_household() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.redeem_household_invite(text) set search_path = public, pg_temp;
alter function public.create_household(text) set search_path = public, pg_temp;

-- Trigger-only helper functions should never be reachable as a PostgREST
-- RPC endpoint (they rely on trigger context / NEW that doesn't exist when
-- called directly, and have no reason to be public API surface).
revoke execute on function public.handle_new_household() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Household-creation / invite-redemption should require a logged-in user;
-- tighten from the default PUBLIC grant (which includes anon) down to
-- authenticated only.
revoke execute on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;

revoke execute on function public.redeem_household_invite(text) from public;
grant execute on function public.redeem_household_invite(text) to authenticated;

-- is_household_member is evaluated inside RLS policies for both anon and
-- authenticated roles (policies are defined for `public`), so both need
-- EXECUTE for those policies to even run; tighten from the implicit PUBLIC
-- grant down to just the two roles that actually need it.
revoke execute on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to anon, authenticated;

-- Enable Realtime for inventory_items so the live-updating inventory list
-- (postgres_changes subscription in the client) actually receives events —
-- the table was never added to the supabase_realtime publication.
alter publication supabase_realtime add table inventory_items;

-- Supabase's default privileges grant EXECUTE to anon/authenticated/service_role
-- explicitly whenever a function is created in public — separate from (and not
-- removed by) revoking from the PUBLIC pseudo-role. Revoke anon explicitly too.
revoke execute on function public.create_household(text) from anon;
revoke execute on function public.redeem_household_invite(text) from anon;
