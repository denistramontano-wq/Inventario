alter table recipes
  add column created_by uuid references auth.users(id) on delete set null;

-- Le ricette erano solo in lettura: nessuna policy di insert esisteva,
-- quindi nessuno poteva aggiungerne. Catalogo condiviso come i prodotti:
-- qualunque utente autenticato può aggiungere una ricetta.
create policy "authenticated users can add recipes" on recipes
  for insert with check ((select auth.uid()) is not null);

create policy "authenticated users can add recipe ingredients" on recipe_ingredients
  for insert with check ((select auth.uid()) is not null);
