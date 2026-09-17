-- RAKSHA-BLOCK cross-device sync setup
-- Run after the three-table schema in Supabase Dashboard -> SQL Editor.

alter table public.profiles replica identity full;
alter table public.block_requests replica identity full;
alter table public.ai_schedule replica identity full;

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
