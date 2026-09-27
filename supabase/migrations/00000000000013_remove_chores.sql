-- L'app "Faccende di Casa" è diventata un progetto separato (repository
-- faccende-di-casa, backend Firebase): rimuove le tabelle aggiunte dalla
-- migration 12 per lei. Resta invece la correzione della policy
-- "owners can remove members" introdotta nella stessa migration.
alter publication supabase_realtime drop table rooms, chores, chore_completions;
drop table chore_completions;
drop table chores;
drop table rooms;
drop table profiles;
drop function shares_household(uuid);
