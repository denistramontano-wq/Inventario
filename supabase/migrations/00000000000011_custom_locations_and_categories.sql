-- Posizioni e categorie personalizzabili per nucleo familiare, invece di
-- un elenco fisso pensato solo per il cibo (Dispensa/Frigo/Freezer/...).
create table household_locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table household_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

alter table household_locations enable row level security;
alter table household_categories enable row level security;

create policy "members can view locations" on household_locations
  for select using (is_household_member(household_id));
create policy "members can add locations" on household_locations
  for insert with check (is_household_member(household_id));
create policy "members can delete locations" on household_locations
  for delete using (is_household_member(household_id));

create policy "members can view categories" on household_categories
  for select using (is_household_member(household_id));
create policy "members can add categories" on household_categories
  for insert with check (is_household_member(household_id));
create policy "members can delete categories" on household_categories
  for delete using (is_household_member(household_id));

-- inventory_items.location e products.category diventano testo libero:
-- non più vincolati a un elenco fisso, ognuno usa le proprie posizioni.
alter table inventory_items drop constraint inventory_items_location_check;
alter table inventory_items alter column location set default 'Altro';

-- Semina posizioni/categorie di default per i nuclei familiari già
-- esistenti, così l'app non parte vuota per chi ha già dati.
insert into household_locations (household_id, name, sort_order)
select h.id, loc.name, loc.sort_order
from households h
cross join (values ('Dispensa',0),('Frigo',1),('Freezer',2),('Cantina',3),('Bagno',4),('Altro',5)) as loc(name, sort_order)
on conflict do nothing;

insert into household_categories (household_id, name, sort_order)
select h.id, cat.name, cat.sort_order
from households h
cross join (values ('Alimentare',0),('Pulizia',1),('Igiene personale',2),('Altro',3)) as cat(name, sort_order)
on conflict do nothing;

-- Aggiorna anche le posizioni testuali già salvate sugli articoli
-- esistenti, così restano coerenti col nuovo casing "Dispensa" invece di
-- "dispensa" usato finora dall'elenco fisso.
update inventory_items set location = initcap(location) where location = lower(location);

-- create_household ora semina anche le posizioni/categorie di default
-- per il nuovo nucleo, in modo che non parta vuoto.
create or replace function create_household(household_name text)
returns households
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_household households;
begin
  insert into households (name, created_by) values (household_name, auth.uid()) returning * into new_household;

  insert into household_locations (household_id, name, sort_order)
  values
    (new_household.id, 'Dispensa', 0),
    (new_household.id, 'Frigo', 1),
    (new_household.id, 'Freezer', 2),
    (new_household.id, 'Cantina', 3),
    (new_household.id, 'Bagno', 4),
    (new_household.id, 'Altro', 5);

  insert into household_categories (household_id, name, sort_order)
  values
    (new_household.id, 'Alimentare', 0),
    (new_household.id, 'Pulizia', 1),
    (new_household.id, 'Igiene personale', 2),
    (new_household.id, 'Altro', 3);

  return new_household;
end;
$$;
