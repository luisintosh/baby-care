create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  caregiver text not null check (caregiver in ('luis', 'clau')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.feed_alert_state (
  id integer primary key default 1 check (id = 1),
  notified_feed_id bigint,
  followup_feed_id bigint
);

insert into public.feed_alert_state (id) values (1);

alter table public.push_subscriptions enable row level security;
alter table public.feed_alert_state enable row level security;

create policy push_subscriptions_anon_all on public.push_subscriptions
  for all
  to anon
  using (true)
  with check (true);

grant select, insert, update, delete on table public.push_subscriptions to anon, service_role;
grant select, update on table public.feed_alert_state to service_role;
revoke all on table public.feed_alert_state from public, anon, authenticated;
grant usage, select on all sequences in schema public to anon;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

-- No-ops until Vault has project_url and cron_secret. Cron runs every 5 minutes.
create or replace function private.invoke_feed_reminder()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
  base_url text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  if secret is null or base_url is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(base_url, '/') || '/functions/v1/feed-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', secret
    ),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.invoke_feed_reminder() from public, anon, authenticated;

select cron.schedule(
  'feed-reminder',
  '*/5 * * * *',
  $$select private.invoke_feed_reminder()$$
);
