-- Hosted Auth would still accept a new email while signups are enabled.
-- Only the two caregiver accounts may be inserted.

create or replace function private.block_new_caregiver_signups()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.email is distinct from 'luis@familia.baby'
     and new.email is distinct from 'clau@familia.baby' then
    raise exception 'signup disabled' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.block_new_caregiver_signups() from public, anon, authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.block_new_caregiver_signups() to supabase_auth_admin;

drop trigger if exists block_new_caregiver_signups on auth.users;
create trigger block_new_caregiver_signups
  before insert on auth.users
  for each row
  execute function private.block_new_caregiver_signups();
