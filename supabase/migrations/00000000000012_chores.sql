-- ============================================================
-- Faccende di casa (app "faccende/"): stanze, faccende ricorrenti,
-- storico completamenti e profili dei membri.
-- Riusa households / household_members / household_invites dell'inventario:
-- la stessa casa condivisa vale per entrambe le app.
-- ============================================================

-- Profilo visibile agli altri membri (nome e avatar)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar text not null default '🙂',
  color text not null default '#3b9ee6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  room_type text not null default 'altro',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index rooms_household_idx on rooms(household_id);

create table chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  -- null = una tantum (da fare una sola volta entro start_date)
  frequency_days int check (frequency_days is null or frequency_days > 0),
  -- prima scadenza (o scadenza della faccenda una tantum)
  start_date date not null default current_date,
  assigned_to uuid references auth.users(id) on delete set null,
  effort smallint not null default 2 check (effort between 1 and 3),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index chores_household_idx on chores(household_id);
create index chores_room_idx on chores(room_id);
create index chores_assigned_to_idx on chores(assigned_to);
create index chores_created_by_idx on chores(created_by);

create table chore_completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  chore_id uuid not null references chores(id) on delete cascade,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz not null default now(),
  points int not null default 10
);
create index chore_completions_household_idx on chore_completions(household_id, completed_at);
create index chore_completions_chore_idx on chore_completions(chore_id);
create index chore_completions_completed_by_idx on chore_completions(completed_by);

alter table profiles enable row level security;
alter table rooms enable row level security;
alter table chores enable row level security;
alter table chore_completions enable row level security;

-- L'utente corrente condivide almeno una casa con `other`?
create or replace function shares_household(other uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from household_members a
    join household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;
revoke execute on function public.shares_household(uuid) from public, anon;
grant execute on function public.shares_household(uuid) to authenticated;

-- profiles
create policy "view own or housemates profiles" on profiles
  for select to authenticated using (id = (select auth.uid()) or shares_household(id));
create policy "insert own profile" on profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "update own profile" on profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- rooms
create policy "members can view rooms" on rooms
  for select using (is_household_member(household_id));
create policy "members can insert rooms" on rooms
  for insert with check (is_household_member(household_id));
create policy "members can update rooms" on rooms
  for update using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "members can delete rooms" on rooms
  for delete using (is_household_member(household_id));

-- chores
create policy "members can view chores" on chores
  for select using (is_household_member(household_id));
create policy "members can insert chores" on chores
  for insert with check (is_household_member(household_id));
create policy "members can update chores" on chores
  for update using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "members can delete chores" on chores
  for delete using (is_household_member(household_id));

-- chore_completions: ognuno registra (e annulla) solo i propri completamenti
create policy "members can view completions" on chore_completions
  for select using (is_household_member(household_id));
create policy "members can complete chores" on chore_completions
  for insert with check (is_household_member(household_id) and completed_by = (select auth.uid()));
create policy "members can undo own completions" on chore_completions
  for delete using (is_household_member(household_id) and completed_by = (select auth.uid()));

create trigger on_profile_updated
  before update on profiles
  for each row execute function set_updated_at();

-- Fix: nella policy originale `household_id` dentro la subquery veniva
-- risolto come m2.household_id (sempre vero), quindi chi era owner di una
-- QUALSIASI casa poteva rimuovere membri da tutte le case che vedeva.
drop policy "owners can remove members" on household_members;
create policy "owners can remove members" on household_members
  for delete using (
    user_id = (select auth.uid())
    or exists (
      select 1 from household_members m2
      where m2.household_id = household_members.household_id
        and m2.user_id = (select auth.uid())
        and m2.role = 'owner'
    )
  );

-- Aggiornamenti in tempo reale tra i membri della casa
alter publication supabase_realtime add table chores;
alter publication supabase_realtime add table chore_completions;
alter publication supabase_realtime add table rooms;
