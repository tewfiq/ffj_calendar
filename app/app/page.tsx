import Link from "next/link"
import { ArrowRight, CalendarRange, GitMerge, Upload } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  listCalendars,
  listEventsBetween,
  listOpenConflicts,
} from "@/lib/queries"
import { formatDateFr, formatTimeFr } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 3600 * 1000)

  const [calendars, upcoming, openConflicts] = await Promise.all([
    listCalendars(),
    listEventsBetween(now.toISOString(), in7Days.toISOString()),
    listOpenConflicts(),
  ])

  const userCalendars = calendars.filter((c) => !c.is_system)
  const systemCalendars = calendars.filter((c) => c.is_system)
  const userUpcoming = upcoming.filter((e) => !e.is_system).slice(0, 8)

  return (
    <>
      <PageHeader
        eyebrow="Tableau de bord"
        title="Bonjour."
        description="Voici un aperçu de vos sept prochains jours. Tout ce qui compte tient ici."
        actions={
          <Button asChild size="sm">
            <Link href="/app/imports/new">
              <Upload className="mr-1 size-4" />
              Importer un CSV
            </Link>
          </Button>
        }
      />

      <section className="px-6 py-6 md:px-8 md:py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            label="Calendriers"
            value={userCalendars.length}
            hint={`${systemCalendars.length} système (vacances scolaires)`}
          />
          <Stat
            label="Événements à venir (7j)"
            value={userUpcoming.length}
            hint="Hors vacances scolaires"
          />
          <Stat
            label="Conflits ouverts"
            value={openConflicts.length}
            tone={openConflicts.length > 0 ? "destructive" : "neutral"}
            hint={openConflicts.length === 0 ? "Aucun arbitrage requis" : "À arbitrer dans l'onglet Conflits"}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Upcoming */}
          <div className="lg:col-span-3">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-medium tracking-tight">Prochains événements</h2>
                <p className="mt-1 text-sm text-muted-foreground">Vos 7 prochains jours, tous agendas confondus.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/calendar">
                  Agenda complet
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
              {userUpcoming.length === 0 ? (
                <Empty className="p-8">
                  <EmptyHeader>
                    <CalendarRange className="mb-2 size-8 text-muted-foreground" />
                    <EmptyTitle>Aucun événement planifié</EmptyTitle>
                    <EmptyDescription>
                      Importez votre premier CSV pour peupler votre vue unifiée.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild size="sm">
                      <Link href="/app/imports/new">Importer un CSV</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {userUpcoming.map((e) => {
                    const cal = calendars.find((c) => c.id === e.calendar_id)
                    return (
                      <li key={e.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="w-20 shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {formatDateFr(e.start_at, { weekday: "short", day: "2-digit", month: "short" })}
                        </div>
                        <div
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cal?.color ?? "var(--primary)" }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.title}</p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {cal?.name ?? "—"} ·{" "}
                            {e.all_day
                              ? "Journée entière"
                              : `${formatTimeFr(e.start_at)} – ${formatTimeFr(e.end_at)}`}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Calendars */}
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-medium tracking-tight">Vos calendriers</h2>
                <p className="mt-1 text-sm text-muted-foreground">Un CSV = un calendrier.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/imports">
                  Gérer
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
              {calendars.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Aucun calendrier.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {calendars.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color ?? "var(--primary)" }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {labelForSource(c.source_type)}
                          {c.school_zone ? ` · Zone ${c.school_zone}` : ""}
                        </p>
                      </div>
                      {!c.is_enabled && (
                        <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          masqué
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {openConflicts.length > 0 && (
          <div className="mt-8 flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <GitMerge className="size-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {openConflicts.length} conflit{openConflicts.length > 1 ? "s" : ""} à arbitrer
                </p>
                <p className="text-xs text-muted-foreground">
                  Les détails et explications sont dans l&apos;onglet Conflits.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/conflicts">Voir les conflits</Link>
            </Button>
          </div>
        )}
      </section>
    </>
  )
}

function labelForSource(t: string): string {
  switch (t) {
    case "csv_import":
      return "Import CSV"
    case "system_school_holidays":
      return "Vacances scolaires"
    case "manual":
      return "Manuel"
    default:
      return t
  }
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string
  value: number
  hint?: string
  tone?: "neutral" | "destructive"
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p
        className={`mt-2 font-semibold tabular-nums ${
          tone === "destructive" ? "text-destructive" : "text-foreground"
        } text-3xl`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
