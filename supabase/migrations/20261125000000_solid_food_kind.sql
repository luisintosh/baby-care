-- Complementary food (papilla) is its own event kind. It is logged in one tap
-- like a poop, has no end time, and does not move the next-feed schedule.
alter table public.events drop constraint if exists events_kind_check;
alter table public.events
  add constraint events_kind_check check (kind in ('feed', 'poop', 'sleep', 'medicine', 'solid'));
