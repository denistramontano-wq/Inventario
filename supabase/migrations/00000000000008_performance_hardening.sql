-- auth.uid() dentro una policy RLS viene rivalutato per ogni riga esaminata;
-- avvolgerlo in (select ...) permette al planner di calcolarlo una sola
-- volta per query (nessun cambio di comportamento, solo più veloce su
-- tabelle grandi). Segnalato dal linter Supabase.

drop policy "authenticated users can create household" on households;
create policy "authenticated users can create household" on households
  for insert with check ((select auth.uid()) is not null);

drop policy "users can join via own insert" on household_members;
create policy "users can join via own insert" on household_members
  for insert with check (user_id = (select auth.uid()));

drop policy "owners can remove members" on household_members;
create policy "owners can remove members" on household_members
  for delete using (
    exists (select 1 from household_members m2 where m2.household_id = household_id and m2.user_id = (select auth.uid()) and m2.role = 'owner')
    or user_id = (select auth.uid())
  );

drop policy "authenticated users can view products" on products;
create policy "authenticated users can view products" on products
  for select using ((select auth.uid()) is not null);

drop policy "authenticated users can add products" on products;
create policy "authenticated users can add products" on products
  for insert with check ((select auth.uid()) is not null);

drop policy "authenticated users can update products" on products;
create policy "authenticated users can update products" on products
  for update using ((select auth.uid()) is not null);

drop policy "authenticated users can view recipes" on recipes;
create policy "authenticated users can view recipes" on recipes
  for select using ((select auth.uid()) is not null);

drop policy "authenticated users can view recipe ingredients" on recipe_ingredients;
create policy "authenticated users can view recipe ingredients" on recipe_ingredients
  for select using ((select auth.uid()) is not null);

-- Indici mancanti sulle foreign key: velocizzano i join usati da tutte le
-- pagine dell'app (inventario per prodotto, movimenti per prodotto, ecc.)
create index if not exists household_invites_created_by_idx on household_invites(created_by);
create index if not exists household_invites_household_id_idx on household_invites(household_id);
create index if not exists household_members_user_id_idx on household_members(user_id);
create index if not exists households_created_by_idx on households(created_by);
create index if not exists inventory_items_added_by_idx on inventory_items(added_by);
create index if not exists inventory_items_product_id_idx on inventory_items(product_id);
create index if not exists inventory_movements_created_by_idx on inventory_movements(created_by);
create index if not exists inventory_movements_product_id_idx on inventory_movements(product_id);
create index if not exists shopping_list_items_product_id_idx on shopping_list_items(product_id);
