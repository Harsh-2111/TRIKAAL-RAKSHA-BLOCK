-- RAKSHA-BLOCK production schema migration.
-- Safe to run repeatedly in the Supabase SQL editor.

create table if not exists public.corridor_capacity (
  section varchar primary key,
  total_tracks int not null,
  line_type varchar not null,
  daily_train_count int not null,
  criticality_tier varchar not null,
  max_hourly_capacity int not null,
  updated_at timestamptz default now()
);

create table if not exists public.trains_master (
  train_no varchar primary key,
  train_name varchar not null,
  type varchar not null,
  priority_class int not null,
  days_of_run varchar not null,
  punctuality_pct float not null,
  avg_passengers int not null
);

create table if not exists public.section_timetable (
  id bigserial primary key,
  train_no varchar references public.trains_master(train_no),
  section varchar references public.corridor_capacity(section),
  arr_time varchar not null,
  dep_time varchar not null,
  direction varchar not null,
  days varchar not null
);

create table if not exists public.defects (
  defect_id varchar primary key,
  source_system varchar not null,
  department varchar not null,
  section varchar references public.corridor_capacity(section),
  severity int not null,
  days_overdue int not null,
  asset_age_years float not null,
  past_failure_count int not null,
  deferred_count int not null,
  calculated_risk_score float not null,
  status varchar default 'OPEN',
  created_at timestamptz default now()
);

create table if not exists public.maintenance_schedules (
  id bigserial primary key,
  defect_id varchar not null unique references public.defects(defect_id),
  section varchar not null references public.corridor_capacity(section),
  department varchar not null,
  start_time_hhmm varchar not null,
  end_time_hhmm varchar not null,
  duration_mins int not null,
  priority_rank int not null,
  updated_at timestamptz default now()
);

create table if not exists public.escalation_logs (
  id bigserial primary key,
  defect_id varchar not null references public.defects(defect_id),
  section varchar not null references public.corridor_capacity(section),
  department varchar not null,
  severity varchar not null,
  reason text not null,
  age_hours float not null,
  requires_emergency_authorization boolean not null default true,
  created_at timestamptz default now()
);

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

create index if not exists idx_defects_section
  on public.defects (section);

create index if not exists idx_defects_department
  on public.defects (department);

create index if not exists idx_section_timetable_section_arr_time
  on public.section_timetable (section, arr_time);

create index if not exists idx_maintenance_schedules_section
  on public.maintenance_schedules (section, start_time_hhmm);

create index if not exists idx_escalation_logs_section_created_at
  on public.escalation_logs (section, created_at);

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

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where pr.prpubid = 'supabase_realtime'::regclass
      and n.nspname = 'public'
      and c.relname = 'notification_events'
  ) then
    alter publication supabase_realtime add table public.notification_events;
  end if;
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where pr.prpubid = 'supabase_realtime'::regclass
      and n.nspname = 'public'
      and c.relname = 'notification_dismissals'
  ) then
    alter publication supabase_realtime add table public.notification_dismissals;
  end if;
end $$;

grant usage, select on sequence public.section_timetable_id_seq to authenticated;
grant select on table public.corridor_capacity, public.trains_master,
  public.section_timetable, public.defects to public;
grant insert, update on table public.corridor_capacity, public.trains_master,
  public.section_timetable, public.defects to authenticated;
grant usage, select on sequence public.maintenance_schedules_id_seq, public.escalation_logs_id_seq to authenticated;
grant select on table public.maintenance_schedules, public.escalation_logs to public;
grant insert, update on table public.maintenance_schedules, public.escalation_logs to authenticated;

alter table public.corridor_capacity enable row level security;
alter table public.trains_master enable row level security;
alter table public.section_timetable enable row level security;
alter table public.defects enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.escalation_logs enable row level security;

drop policy if exists "corridor_capacity_public_select" on public.corridor_capacity;
create policy "corridor_capacity_public_select" on public.corridor_capacity
for select to public using (true);

drop policy if exists "corridor_capacity_authenticated_insert" on public.corridor_capacity;
create policy "corridor_capacity_authenticated_insert" on public.corridor_capacity
for insert to authenticated with check (true);

drop policy if exists "corridor_capacity_authenticated_update" on public.corridor_capacity;
create policy "corridor_capacity_authenticated_update" on public.corridor_capacity
for update to authenticated using (true) with check (true);

drop policy if exists "trains_master_public_select" on public.trains_master;
create policy "trains_master_public_select" on public.trains_master
for select to public using (true);

drop policy if exists "trains_master_authenticated_insert" on public.trains_master;
create policy "trains_master_authenticated_insert" on public.trains_master
for insert to authenticated with check (true);

drop policy if exists "trains_master_authenticated_update" on public.trains_master;
create policy "trains_master_authenticated_update" on public.trains_master
for update to authenticated using (true) with check (true);

drop policy if exists "section_timetable_public_select" on public.section_timetable;
create policy "section_timetable_public_select" on public.section_timetable
for select to public using (true);

drop policy if exists "section_timetable_authenticated_insert" on public.section_timetable;
create policy "section_timetable_authenticated_insert" on public.section_timetable
for insert to authenticated with check (true);

drop policy if exists "section_timetable_authenticated_update" on public.section_timetable;
create policy "section_timetable_authenticated_update" on public.section_timetable
for update to authenticated using (true) with check (true);

drop policy if exists "defects_public_select" on public.defects;
create policy "defects_public_select" on public.defects
for select to public using (true);

drop policy if exists "defects_authenticated_insert" on public.defects;
create policy "defects_authenticated_insert" on public.defects
for insert to authenticated with check (true);

drop policy if exists "defects_authenticated_update" on public.defects;
create policy "defects_authenticated_update" on public.defects
for update to authenticated using (true) with check (true);

drop policy if exists "maintenance_schedules_public_select" on public.maintenance_schedules;
create policy "maintenance_schedules_public_select" on public.maintenance_schedules
for select to public using (true);

drop policy if exists "maintenance_schedules_authenticated_insert" on public.maintenance_schedules;
create policy "maintenance_schedules_authenticated_insert" on public.maintenance_schedules
for insert to authenticated with check (true);

drop policy if exists "maintenance_schedules_authenticated_update" on public.maintenance_schedules;
create policy "maintenance_schedules_authenticated_update" on public.maintenance_schedules
for update to authenticated using (true) with check (true);

drop policy if exists "escalation_logs_public_select" on public.escalation_logs;
create policy "escalation_logs_public_select" on public.escalation_logs
for select to public using (true);

drop policy if exists "escalation_logs_authenticated_insert" on public.escalation_logs;
create policy "escalation_logs_authenticated_insert" on public.escalation_logs
for insert to authenticated with check (true);

drop policy if exists "escalation_logs_authenticated_update" on public.escalation_logs;
create policy "escalation_logs_authenticated_update" on public.escalation_logs
for update to authenticated using (true) with check (true);