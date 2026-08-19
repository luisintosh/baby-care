create table public.events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('feed', 'poop', 'sleep', 'medicine')),
  occurred_at timestamptz not null,
  ended_at timestamptz,
  caregiver text not null check (caregiver in ('luis', 'clau')),
  note text,
  created_at timestamptz not null default now(),
  constraint events_ended_at_after_start check (ended_at is null or ended_at >= occurred_at),
  constraint events_ended_at_sleep_only check (ended_at is null or kind = 'sleep')
);

create index events_occurred_at_desc_idx on public.events (occurred_at desc);

create unique index events_one_open_sleep_idx
  on public.events (kind)
  where kind = 'sleep' and ended_at is null;

create table public.reminders (
  id bigint generated always as identity primary key,
  title text not null,
  starts_on date not null,
  ends_on date not null,
  completed_at timestamptz,
  completed_by text check (completed_by in ('luis', 'clau')),
  created_at timestamptz not null default now(),
  constraint reminders_range_valid check (ends_on >= starts_on)
);

create index reminders_active_idx
  on public.reminders (starts_on, ends_on)
  where completed_at is null;

alter table public.events enable row level security;
alter table public.reminders enable row level security;

create policy events_anon_all on public.events
  for all
  to anon
  using (true)
  with check (true);

create policy reminders_anon_all on public.reminders
  for all
  to anon
  using (true)
  with check (true);

grant select, insert, update, delete on table public.events to anon;
grant select, insert, update, delete on table public.reminders to anon;
grant usage, select on all sequences in schema public to anon;

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.reminders;
