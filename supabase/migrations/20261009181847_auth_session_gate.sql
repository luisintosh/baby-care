-- The anon key no longer reaches the log. Both caregivers share one log,
-- so any signed-in session can read and write every row.
-- feed_alert_state stays service-role only; the feed cron does not use a session.

drop policy if exists events_anon_all on public.events;
drop policy if exists events_authenticated_all on public.events;
create policy events_authenticated_all on public.events
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists reminders_anon_all on public.reminders;
drop policy if exists reminders_authenticated_all on public.reminders;
create policy reminders_authenticated_all on public.reminders
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists push_subscriptions_anon_all on public.push_subscriptions;
drop policy if exists push_subscriptions_authenticated_all on public.push_subscriptions;
create policy push_subscriptions_authenticated_all on public.push_subscriptions
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists feed_schedule_anon_all on public.feed_schedule;
drop policy if exists feed_schedule_authenticated_all on public.feed_schedule;
create policy feed_schedule_authenticated_all on public.feed_schedule
  for all
  to authenticated
  using (true)
  with check (true);

revoke all on table public.events from anon;
revoke all on table public.reminders from anon;
revoke all on table public.push_subscriptions from anon;
revoke all on table public.feed_schedule from anon;
revoke all on all sequences in schema public from anon;
grant usage, select on all sequences in schema public to authenticated;

-- Shared passphrase is the birthday in Mexican dd/mm/aaaa: 09/05/2026.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  is_sso_user,
  is_anonymous
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  people.email,
  extensions.crypt('09/05/2026', extensions.gen_salt('bf')),
  now(),
  jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email'),
    'caregiver', people.caregiver
  ),
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  false,
  false
from (
  values
    ('luis@familia.baby', 'luis'),
    ('clau@familia.baby', 'clau')
) as people(email, caregiver)
where not exists (
  select 1 from auth.users as existing where existing.email = people.email
);

insert into auth.identities (
  user_id,
  provider_id,
  identity_data,
  provider,
  created_at,
  updated_at
)
select
  users.id,
  users.id::text,
  jsonb_build_object('sub', users.id::text, 'email', users.email),
  'email',
  now(),
  now()
from auth.users as users
where users.email in ('luis@familia.baby', 'clau@familia.baby')
  and not exists (
    select 1
    from auth.identities as existing
    where existing.user_id = users.id
      and existing.provider = 'email'
  );
