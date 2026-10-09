create table public.feed_schedule (
  id integer primary key default 1 check (id = 1),
  day_minutes integer not null default 240
    check (day_minutes >= 30 and day_minutes <= 480),
  night_minutes integer not null default 300
    check (night_minutes >= 30 and night_minutes <= 480)
);

insert into public.feed_schedule (id) values (1);

alter table public.feed_schedule enable row level security;

create policy feed_schedule_anon_all on public.feed_schedule
  for all
  to anon
  using (true)
  with check (true);

grant select, update on table public.feed_schedule to anon, service_role;

alter publication supabase_realtime add table public.feed_schedule;
