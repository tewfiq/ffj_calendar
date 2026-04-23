-- Seed French school holidays (vacances scolaires) for school years 2024-2025 and 2025-2026.
-- Source: calendrier officiel Ministère de l'Éducation nationale.
-- Dates stored as all-day events spanning the official start (evening of last day of class)
-- through end (morning of day classes resume) — we use inclusive calendar-day ranges.

-- 1) Create the three system calendars (Zone A / B / C) if they don't already exist.
insert into calendars (id, name, slug, source_type, color, is_system, school_zone, metadata)
select gen_random_uuid()::text, 'Vacances scolaires - Zone A', 'holidays-zone-a', 'system_school_holidays', '#6B8FB5', true, 'A',
       jsonb_build_object('description', 'Vacances officielles Zone A (France)')
where not exists (select 1 from calendars where slug = 'holidays-zone-a');

insert into calendars (id, name, slug, source_type, color, is_system, school_zone, metadata)
select gen_random_uuid()::text, 'Vacances scolaires - Zone B', 'holidays-zone-b', 'system_school_holidays', '#8BA888', true, 'B',
       jsonb_build_object('description', 'Vacances officielles Zone B (France)')
where not exists (select 1 from calendars where slug = 'holidays-zone-b');

insert into calendars (id, name, slug, source_type, color, is_system, school_zone, metadata)
select gen_random_uuid()::text, 'Vacances scolaires - Zone C', 'holidays-zone-c', 'system_school_holidays', '#C9A66B', true, 'C',
       jsonb_build_object('description', 'Vacances officielles Zone C (France)')
where not exists (select 1 from calendars where slug = 'holidays-zone-c');

-- 2) Clear any existing system vacation events (idempotent re-seeding).
delete from events where is_system = true and system_type = 'vacation_period';

-- 3) Insert vacation events.
-- Shared (all zones) vacations: Toussaint, Noel, Ete for both school years.
-- We insert one event per zone calendar so toggling a single zone works naturally.

with zones as (
  select id as calendar_id, school_zone from calendars where source_type = 'system_school_holidays'
),
periods as (
  -- 2024-2025
  select 'Vacances de la Toussaint'::text as title, date '2024-10-19' as d_start, date '2024-11-04' as d_end, null::text as only_zone union all
  select 'Vacances de Noel',                      date '2024-12-21',          date '2025-01-06',          null union all
  select 'Vacances d''hiver',                     date '2025-02-22',          date '2025-03-10',          'A'  union all
  select 'Vacances d''hiver',                     date '2025-02-08',          date '2025-02-24',          'B'  union all
  select 'Vacances d''hiver',                     date '2025-02-15',          date '2025-03-03',          'C'  union all
  select 'Vacances de printemps',                 date '2025-04-19',          date '2025-05-05',          'A'  union all
  select 'Vacances de printemps',                 date '2025-04-05',          date '2025-04-22',          'B'  union all
  select 'Vacances de printemps',                 date '2025-04-12',          date '2025-04-28',          'C'  union all
  select 'Vacances d''ete',                       date '2025-07-05',          date '2025-09-01',          null union all
  -- 2025-2026
  select 'Vacances de la Toussaint',              date '2025-10-18',          date '2025-11-03',          null union all
  select 'Vacances de Noel',                      date '2025-12-20',          date '2026-01-05',          null union all
  select 'Vacances d''hiver',                     date '2026-02-07',          date '2026-02-23',          'A'  union all
  select 'Vacances d''hiver',                     date '2026-02-21',          date '2026-03-09',          'B'  union all
  select 'Vacances d''hiver',                     date '2026-02-14',          date '2026-03-02',          'C'  union all
  select 'Vacances de printemps',                 date '2026-04-04',          date '2026-04-20',          'A'  union all
  select 'Vacances de printemps',                 date '2026-04-18',          date '2026-05-04',          'B'  union all
  select 'Vacances de printemps',                 date '2026-04-11',          date '2026-04-27',          'C'  union all
  select 'Vacances d''ete',                       date '2026-07-04',          date '2026-08-31',          null
)
insert into events (
  calendar_id, title, start_at, end_at, all_day, timezone,
  priority, movable, hard_constraint, category,
  is_system, system_type, school_zone
)
select
  z.calendar_id,
  p.title,
  (p.d_start::timestamp at time zone 'Europe/Paris'),
  ((p.d_end + interval '1 day')::timestamp at time zone 'Europe/Paris'),
  true,
  'Europe/Paris',
  'high',
  'locked',
  true,
  'vacances_scolaires',
  true,
  'vacation_period',
  z.school_zone
from zones z
cross join periods p
where p.only_zone is null or p.only_zone = z.school_zone;
