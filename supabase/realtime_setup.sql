-- RAKSHA-BLOCK cross-device sync setup
-- Run this in the hosted Supabase SQL Editor. It is safe to run repeatedly.

-- These tables must exist before replica identity or Realtime publication can
-- be configured. This also repairs projects where schema.sql was only partly run.
create table if not exists public.notification_events (
  id varchar primary key,
  type varchar not null,
  title text not null,
  message text not null,
  request_id varchar,
  department varchar,
  target_role varchar,
  source_role varchar,
  sender_id varchar,
  priority varchar default 'NORMAL',
  timestamp varchar,
  created_at timestamptz default now()
);

create table if not exists public.notification_dismissals (
  user_id varchar not null,
  notification_id varchar not null references public.notification_events(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, notification_id)
);

create index if not exists idx_notification_events_created_at
  on public.notification_events (created_at desc);

alter table public.notification_events enable row level security;
alter table public.notification_dismissals enable row level security;

drop policy if exists "notification_events_public_select" on public.notification_events;
create policy "notification_events_public_select" on public.notification_events
for select to public using (true);

drop policy if exists "notification_events_public_insert" on public.notification_events;
create policy "notification_events_public_insert" on public.notification_events
for insert to public with check (true);

drop policy if exists "notification_dismissals_public_select" on public.notification_dismissals;
create policy "notification_dismissals_public_select" on public.notification_dismissals
for select to public using (true);

drop policy if exists "notification_dismissals_public_insert" on public.notification_dismissals;
create policy "notification_dismissals_public_insert" on public.notification_dismissals
for insert to public with check (true);

grant select, insert on table public.notification_events to anon, authenticated;
grant select, insert on table public.notification_dismissals to anon, authenticated;

alter table public.profiles replica identity full;
alter table public.block_requests replica identity full;
alter table public.ai_schedule replica identity full;
alter table public.notification_events replica identity full;
alter table public.notification_dismissals replica identity full;

-- Preserve the complete client request without adding another table.
alter table public.block_requests add column if not exists request_data jsonb;

grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.block_requests to anon, authenticated;
grant select, insert, update, delete on table public.ai_schedule to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.block_requests enable row level security;
alter table public.ai_schedule enable row level security;

drop policy if exists "Allow public read access" on public.profiles;
drop policy if exists "profiles_public_access" on public.profiles;
create policy "profiles_public_access" on public.profiles
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow public access block_requests" on public.block_requests;
drop policy if exists "block_requests_public_access" on public.block_requests;
create policy "block_requests_public_access" on public.block_requests
for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow public access ai_schedule" on public.ai_schedule;
drop policy if exists "ai_schedule_public_access" on public.ai_schedule;
create policy "ai_schedule_public_access" on public.ai_schedule
for all to anon, authenticated using (true) with check (true);

-- Realtime only emits changes for tables in this publication.
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.block_requests;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.ai_schedule;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.notification_events;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.notification_dismissals;
exception when duplicate_object then null;
end
$$;
