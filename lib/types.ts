// Canonical domain types for Constellation Lite.
// Mirrors the Postgres schema in /scripts/001_init_schema.sql.

export type SourceType = "csv_import" | "system_school_holidays" | "manual"
export type Priority = "low" | "medium" | "high" | "critical"
export type Movable = "movable" | "locked"
export type SchoolZone = "A" | "B" | "C"
export type HolidayMode = "informational" | "soft_block" | "hard_block"
export type ConflictType =
  | "strict_overlap"
  | "buffer_violation"
  | "working_hours_violation"
  | "school_holiday_violation"
  | "priority_violation"
export type ConflictSeverity = "low" | "medium" | "critical"
export type ConflictStatus = "open" | "resolved" | "ignored"
export type ImportStatus = "pending" | "parsed" | "committed" | "failed"

export interface Calendar {
  id: string
  name: string
  slug: string | null
  source_type: SourceType
  color: string | null
  timezone: string
  is_system: boolean
  is_enabled: boolean
  school_zone: SchoolZone | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  calendar_id: string
  source_event_id: string | null
  title: string
  description: string | null
  location: string | null
  start_at: string
  end_at: string
  all_day: boolean
  timezone: string
  priority: Priority
  movable: Movable
  hard_constraint: boolean
  soft_constraint: boolean
  buffer_before_minutes: number
  buffer_after_minutes: number
  category: string | null
  visibility: string | null
  status: string | null
  is_system: boolean
  system_type: string | null
  school_zone: SchoolZone | null
  created_at: string
  updated_at: string
}

export interface Import {
  id: string
  calendar_id: string
  filename: string
  status: ImportStatus
  column_mapping: Record<string, string> | null
  row_count: number
  error_count: number
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface Conflict {
  id: string
  event_ids: string[]
  type: ConflictType
  severity: ConflictSeverity
  status: ConflictStatus
  detected_at: string
  explanation: string | null
  score_impact: number | null
  related_suggestion_ids: string[] | null
  created_at: string
}

export interface UserSettings {
  id: string
  timezone: string
  locale: string
  school_zone: SchoolZone
  holiday_mode: HolidayMode
  working_hours: Record<string, { start: string; end: string } | null> | null
  default_buffer_minutes: number
  preferred_meeting_windows: unknown
  theme_preference: "light" | "dark" | "system"
  created_at: string
  updated_at: string
}

// Canonical CSV column mapping targets.
export const CSV_TARGET_FIELDS = [
  "title",
  "start_at",
  "end_at",
  "all_day",
  "location",
  "description",
  "priority",
  "movable",
  "category",
  "timezone",
] as const

export type CsvTargetField = (typeof CSV_TARGET_FIELDS)[number]
