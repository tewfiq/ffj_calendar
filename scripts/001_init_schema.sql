-- Constellation Lite — initial schema
-- Postgres (Supabase). Single-user V1. userId intentionally omitted.

create extension if not exists "pgcrypto";

-- Calendars: each imported CSV becomes one calendar. System calendars (holidays) also live here.
create table if not exists calendars (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text,
  source_type text not null,                -- csv_import | system_school_holidays | manual
  color text,
  timezone text not null default 'Europe/Paris',
  is_system boolean not null default false,
  is_enabled boolean not null default true,
  school_zone text,                          -- A | B | C for system school calendars
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Imports: one row per CSV upload attempt.
create table if not exists imports (
  id text primary key default gen_random_uuid()::text,
  calendar_id text not null references calendars(id) on delete cascade,
  filename text not null,
  status text not null,                      -- pending | parsed | committed | failed
  column_mapping jsonb,
  row_count int not null default 0,
  error_count int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Events: normalized unified event model across every calendar.
create table if not exists events (
  id text primary key default gen_random_uuid()::text,
  calendar_id text not null references calendars(id) on delete cascade,
  source_event_id text,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'Europe/Paris',
  priority text not null default 'medium',        -- low | medium | high | critical
  movable text not null default 'movable',        -- movable | locked
  hard_constraint boolean not null default false,
  soft_constraint boolean not null default false,
  buffer_before_minutes int not null default 0,
  buffer_after_minutes int not null default 0,
  category text,
  visibility text,
  status text,
  is_system boolean not null default false,
  system_type text,                                -- vacation_period | special_no_school_day | ...
  school_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_calendar_id on events(calendar_id);
create index if not exists idx_events_start_at on events(start_at);
create index if not exists idx_events_end_at on events(end_at);
create index if not exists idx_events_is_system on events(is_system);
create index if not exists idx_events_school_zone on events(school_zone);

-- Conflicts: detected deterministic clashes between events.
create table if not exists conflicts (
  id text primary key default gen_random_uuid()::text,
  event_ids jsonb not null,                  -- array of event ids
  type text not null,                         -- strict_overlap | buffer_violation | working_hours_violation | school_holiday_violation | priority_violation
  severity text not null,                     -- low | medium | critical
  status text not null default 'open',        -- open | resolved | ignored
  detected_at timestamptz not null default now(),
  explanation text,
  score_impact real,
  related_suggestion_ids jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_conflicts_status on conflicts(status);

-- Suggestions: ranked alternatives produced by the scheduling engine.
create table if not exists suggestions (
  id text primary key default gen_random_uuid()::text,
  conflict_id text not null references conflicts(id) on delete cascade,
  proposed_action text not null,              -- reschedule | shorten | split | drop
  target_event_id text,
  new_start_at timestamptz,
  new_end_at timestamptz,
  score real not null,
  rationale text,
  impact_summary text,
  status text not null default 'pending',     -- pending | accepted | rejected | ignored
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  rejected_at timestamptz
);

create index if not exists idx_suggestions_conflict_id on suggestions(conflict_id);

-- UserSettings: single row in single-user mode.
create table if not exists user_settings (
  id text primary key default gen_random_uuid()::text,
  timezone text not null default 'Europe/Paris',
  locale text not null default 'fr-FR',
  school_zone text not null default 'C',
  holiday_mode text not null default 'soft_block',   -- informational | soft_block | hard_block
  working_hours jsonb,                                -- { mon: {start:"09:00", end:"18:00"}, ... }
  default_buffer_minutes int not null default 15,
  preferred_meeting_windows jsonb,
  theme_preference text not null default 'system',    -- light | dark | system
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed single settings row with sane defaults if none exists.
insert into user_settings (
  timezone, locale, school_zone, holiday_mode, default_buffer_minutes, theme_preference, working_hours
)
select
  'Europe/Paris', 'fr-FR', 'C', 'soft_block', 15, 'system',
  jsonb_build_object(
    'mon', jsonb_build_object('start','09:00','end','18:00'),
    'tue', jsonb_build_object('start','09:00','end','18:00'),
    'wed', jsonb_build_object('start','09:00','end','18:00'),
    'thu', jsonb_build_object('start','09:00','end','18:00'),
    'fri', jsonb_build_object('start','09:00','end','18:00'),
    'sat', null,
    'sun', null
  )
where not exists (select 1 from user_settings);
