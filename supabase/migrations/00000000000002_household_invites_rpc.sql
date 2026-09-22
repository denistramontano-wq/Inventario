create or replace function redeem_household_invite(invite_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  target_household_id uuid;
begin
  select household_id into target_household_id
  from household_invites
  where code = invite_code and expires_at > now();

  if target_household_id is null then
    raise exception 'Codice invito non valido o scaduto';
  end if;

  insert into household_members (household_id, user_id, role)
  values (target_household_id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;

  return target_household_id;
end;
$$;

grant execute on function redeem_household_invite(text) to authenticated;
