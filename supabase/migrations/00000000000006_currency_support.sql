alter table households
  add column default_currency text not null default 'EUR';

alter table inventory_items
  add column currency text not null default 'EUR';

alter table inventory_movements
  add column currency text not null default 'EUR';

-- Impostazioni come la valuta preferita sono comodità condivise dal nucleo,
-- non richiedono il ruolo owner: qualunque membro può modificarle.
drop policy "owners can update household" on households;
create policy "members can update household" on households
  for update using (is_household_member(id));
