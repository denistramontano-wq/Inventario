-- L'insert diretto su households da client con `.select()` falliva con
-- "new row violates row-level security policy for table households":
-- la policy di SELECT (is_household_member) viene valutata per il RETURNING
-- prima che il trigger AFTER INSERT registri l'utente come membro.
-- Spostando l'insert in una funzione SECURITY DEFINER si bypassa RLS e si
-- evita il problema di timing.
create or replace function create_household(household_name text)
returns households
language plpgsql
security definer
as $$
declare
  new_household households;
begin
  insert into households (name, created_by) values (household_name, auth.uid()) returning * into new_household;
  return new_household;
end;
$$;

grant execute on function create_household(text) to authenticated;
