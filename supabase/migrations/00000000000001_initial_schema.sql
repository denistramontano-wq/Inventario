-- ============================================================
-- Inventario Casa - Schema iniziale
-- ============================================================

-- Nuclei familiari (per condivisione multi-utente)
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Membri di un nucleo familiare
create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Inviti a un nucleo familiare (via codice)
create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

-- Cache prodotti (da OpenFoodFacts o inseriti manualmente)
create table products (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text not null,
  brand text,
  category text,
  image_url text,
  unit text not null default 'pz' check (unit in ('pz', 'g', 'kg', 'ml', 'l')),
  nutrition jsonb,
  source text not null default 'manual' check (source in ('openfoodfacts', 'manual')),
  created_at timestamptz not null default now()
);
create index products_barcode_idx on products(barcode);

-- Articoli in inventario (per nucleo familiare)
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity numeric not null default 1 check (quantity >= 0),
  unit text not null default 'pz',
  location text default 'dispensa' check (location in ('dispensa', 'frigo', 'freezer', 'cantina', 'altro')),
  low_stock_threshold numeric default 1,
  expiry_date date,
  price numeric(10,2),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inventory_household_idx on inventory_items(household_id);
create index inventory_expiry_idx on inventory_items(expiry_date);

-- Storico movimenti (per statistiche spesa/spreco)
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  type text not null check (type in ('added', 'consumed', 'wasted', 'adjusted')),
  quantity numeric not null,
  unit text not null default 'pz',
  price numeric(10,2),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index movements_household_idx on inventory_movements(household_id);
create index movements_created_idx on inventory_movements(created_at);

-- Lista della spesa
create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  custom_name text,
  quantity numeric not null default 1,
  unit text not null default 'pz',
  is_checked boolean not null default false,
  auto_added boolean not null default false,
  created_at timestamptz not null default now()
);
create index shopping_list_household_idx on shopping_list_items(household_id);

-- Ricette
create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  instructions text,
  image_url text,
  prep_minutes int,
  created_at timestamptz not null default now()
);

-- Ingredienti di una ricetta (match testuale con i prodotti)
create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text
);
create index recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;
alter table products enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table shopping_list_items enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

-- Helper: l'utente è membro di questo household?
create or replace function is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- households: visibili/gestibili solo dai membri
create policy "members can view household" on households
  for select using (is_household_member(id));
create policy "authenticated users can create household" on households
  for insert with check (auth.uid() is not null);
create policy "owners can update household" on households
  for update using (
    exists (select 1 from household_members where household_id = id and user_id = auth.uid() and role = 'owner')
  );

-- household_members
create policy "members can view membership" on household_members
  for select using (is_household_member(household_id));
create policy "users can join via own insert" on household_members
  for insert with check (user_id = auth.uid());
create policy "owners can remove members" on household_members
  for delete using (
    exists (select 1 from household_members m2 where m2.household_id = household_id and m2.user_id = auth.uid() and m2.role = 'owner')
    or user_id = auth.uid()
  );

-- household_invites
create policy "members can view invites" on household_invites
  for select using (is_household_member(household_id));
create policy "members can create invites" on household_invites
  for insert with check (is_household_member(household_id));
create policy "members can delete invites" on household_invites
  for delete using (is_household_member(household_id));

-- products: catalogo condiviso, leggibile da tutti gli autenticati
create policy "authenticated users can view products" on products
  for select using (auth.uid() is not null);
create policy "authenticated users can add products" on products
  for insert with check (auth.uid() is not null);
create policy "authenticated users can update products" on products
  for update using (auth.uid() is not null);

-- inventory_items
create policy "members can view inventory" on inventory_items
  for select using (is_household_member(household_id));
create policy "members can insert inventory" on inventory_items
  for insert with check (is_household_member(household_id));
create policy "members can update inventory" on inventory_items
  for update using (is_household_member(household_id));
create policy "members can delete inventory" on inventory_items
  for delete using (is_household_member(household_id));

-- inventory_movements
create policy "members can view movements" on inventory_movements
  for select using (is_household_member(household_id));
create policy "members can insert movements" on inventory_movements
  for insert with check (is_household_member(household_id));

-- shopping_list_items
create policy "members can view shopping list" on shopping_list_items
  for select using (is_household_member(household_id));
create policy "members can insert shopping list" on shopping_list_items
  for insert with check (is_household_member(household_id));
create policy "members can update shopping list" on shopping_list_items
  for update using (is_household_member(household_id));
create policy "members can delete shopping list" on shopping_list_items
  for delete using (is_household_member(household_id));

-- recipes & recipe_ingredients: catalogo pubblico in lettura per autenticati
create policy "authenticated users can view recipes" on recipes
  for select using (auth.uid() is not null);
create policy "authenticated users can view recipe ingredients" on recipe_ingredients
  for select using (auth.uid() is not null);

-- trigger: quando un utente crea un household, diventa owner automaticamente
create or replace function handle_new_household()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into household_members (household_id, user_id, role)
  values (new.id, auth.uid(), 'owner');
  return new;
end;
$$;

create trigger on_household_created
  after insert on households
  for each row execute function handle_new_household();

-- trigger: aggiorna updated_at su inventory_items
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_inventory_item_updated
  before update on inventory_items
  for each row execute function set_updated_at();
