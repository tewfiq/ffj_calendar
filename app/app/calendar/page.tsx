import Link from "next/link"
import { ChevronLeft, ChevronRight, Upload } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { listCalendars, listEventsBetween, listOpenConflicts } from "@/lib/queries"
import { FRENCH_MONTHS, FRENCH_WEEKDAYS_SHORT, eventTouchesDay, isSameDay, monthGrid, toISODate } from "@/lib/dates"
import type { Event } from "@/lib/types"
import { CalendarLegend } from "@/components/app/calendar-legend"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ y?: string; m?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const today = new Date()
  const year = Number(params.y ?? today.getFullYear())
  const monthIndex = Number(params.m ?? today.getMonth()) // 0-indexed

  const grid = monthGrid(year, monthIndex)
  const rangeStart = grid[0]
  const rangeEnd = new Date(grid[grid.length - 1].getTime() + 24 * 3600 * 1000)

  const [calendars, events, openConflicts] = await Promise.all([
    listCalendars(),
    listEventsBetween(rangeStart.toISOString(), rangeEnd.toISOString()),
    listOpenConflicts(),
  ])

  const calendarMap = new Map(calendars.map((c) => [c.id, c]))
  const enabledCalendarIds = new Set(calendars.filter((c) => c.is_enabled).map((c) => c.id))
  const visible = events.filter((e) => enabledCalendarIds.has(e.calendar_id))

  // Map each event id to a bit: has conflict?
  const eventsInConflict = new Set<string>()
  for (const c of openConflicts) for (const id of c.event_ids) eventsInConflict.add(id)

  const prev = prevMonth(year, monthIndex)
  const next = nextMonth(year, monthIndex)
  const todayISO = toISODate(today)

  return (
    <>
      <PageHeader
        eyebrow="Agenda unifié"
        title={`${FRENCH_MONTHS[monthIndex]} ${year}`}
        description="Tous vos calendriers, superposés. Les vacances scolaires apparaissent en arrière-plan."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" aria-label="Mois précédent">
              <Link href={`/app/calendar?y=${prev.y}&m=${prev.m}`}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/calendar?y=${today.getFullYear()}&m=${today.getMonth()}`}>Aujourd&apos;hui</Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Mois suivant">
              <Link href={`/app/calendar?y=${next.y}&m=${next.m}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" className="ml-2">
              <Link href="/app/imports/new">
                <Upload className="mr-1 size-4" />
                Importer
              </Link>
            </Button>
          </div>
        }
      />

      <section className="px-6 py-6 md:px-8 md:py-8">
        <CalendarLegend calendars={calendars} />

        <div className="mt-6 overflow-hidden rounded-md border border-border bg-card">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
            {FRENCH_WEEKDAYS_SHORT.map((w, i) => (
              <div
                key={i}
                className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {grid.map((day, i) => {
              const dayEvents = visible.filter((e) => eventTouchesDay(e.start_at, e.end_at, day))
              const holiday = dayEvents.find((e) => e.is_system && e.system_type === "vacation_period")
              const userEvents = dayEvents.filter((e) => !e.is_system)
              const inMonth = day.getMonth() === monthIndex
              const isToday = toISODate(day) === todayISO

              return (
                <div
                  key={i}
                  className={[
                    "relative flex min-h-28 flex-col border-b border-r border-border p-2",
                    !inMonth ? "bg-secondary/20 text-muted-foreground" : "",
                    holiday ? "bg-accent/10" : "",
                    i % 7 === 6 ? "border-r-0" : "",
                    i >= 35 ? "border-b-0" : "",
                  ].join(" ")}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={[
                        "inline-flex size-6 items-center justify-center rounded-sm font-mono text-[11px] tabular-nums",
                        isToday ? "bg-primary text-primary-foreground font-semibold" : "text-foreground",
                      ].join(" ")}
                    >
                      {day.getDate()}
                    </span>
                    {holiday && (
                      <span
                        className="hidden font-mono text-[9px] uppercase tracking-widest text-accent-foreground/70 md:inline"
                        title={holiday.title}
                      >
                        {holiday.school_zone ? `Zone ${holiday.school_zone}` : "Vacances"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    {userEvents.slice(0, 3).map((e) => (
                      <EventChip
                        key={e.id}
                        event={e}
                        color={calendarMap.get(e.calendar_id)?.color ?? "#0066B1"}
                        hasConflict={eventsInConflict.has(e.id)}
                      />
                    ))}
                    {userEvents.length > 3 && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        +{userEvents.length - 3} autres
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}

function prevMonth(y: number, m: number) {
  if (m === 0) return { y: y - 1, m: 11 }
  return { y, m: m - 1 }
}

function nextMonth(y: number, m: number) {
  if (m === 11) return { y: y + 1, m: 0 }
  return { y, m: m + 1 }
}

function EventChip({
  event,
  color,
  hasConflict,
}: {
  event: Event
  color: string
  hasConflict: boolean
}) {
  const time = event.all_day
    ? ""
    : new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      }).format(new Date(event.start_at))
  return (
    <div
      className={[
        "group flex items-center gap-1.5 overflow-hidden rounded-sm border px-1.5 py-0.5 text-[11px] transition-colors",
        hasConflict
          ? "border-destructive/40 bg-destructive/10 text-foreground"
          : "border-border bg-background hover:bg-secondary",
      ].join(" ")}
      title={event.title}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {time && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{time}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  )
}

// Use `isSameDay` import below just to keep the bundler happy if tree-shaken variants remove it;
// it is used indirectly via eventTouchesDay's day-based math in date helpers.
void isSameDay
