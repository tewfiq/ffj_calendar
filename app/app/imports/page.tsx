import Link from "next/link"
import { Upload } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { listCalendars, listImports } from "@/lib/queries"
import { formatDateTimeFr } from "@/lib/dates"
import { CalendarRow } from "@/components/app/calendar-row"

export const dynamic = "force-dynamic"

export default async function ImportsPage() {
  const [imports, calendars] = await Promise.all([listImports(), listCalendars()])
  const userCalendars = calendars.filter((c) => !c.is_system)
  const systemCalendars = calendars.filter((c) => c.is_system)

  return (
    <>
      <PageHeader
        eyebrow="Imports"
        title="Imports"
        description="Chaque import (CSV ou iCal/Google Agenda) devient un calendrier autonome, que vous pouvez activer, masquer ou supprimer."
        actions={
          <Button asChild size="sm">
            <Link href="/app/imports/new">
              <Upload className="mr-1 size-4" />
              Nouvel import
            </Link>
          </Button>
        }
      />

      <section className="px-6 py-6 md:px-8 md:py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="text-lg font-medium tracking-tight">Historique</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tous les imports, les plus récents en premier.</p>
            <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
              {imports.length === 0 ? (
                <Empty className="p-8">
                  <EmptyHeader>
                    <Upload className="mb-2 size-8 text-muted-foreground" />
                    <EmptyTitle>Aucun import pour le moment</EmptyTitle>
                    <EmptyDescription>
                      Importez un CSV ou connectez un agenda iCal (Google Agenda) pour commencer.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild size="sm">
                      <Link href="/app/imports/new">Commencer</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {imports.map((i) => (
                    <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                      <StatusDot status={i.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.filename}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {i.calendar_name ?? "—"} · {formatDateTimeFr(i.created_at)} · {i.row_count} lignes
                          {i.error_count > 0 ? ` · ${i.error_count} erreurs` : ""}
                        </p>
                      </div>
                      <span className="rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {labelForStatus(i.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-lg font-medium tracking-tight">Calendriers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Basculer, masquer, ou supprimer.</p>
            <div className="mt-4 overflow-hidden rounded-md border border-border bg-card">
              {calendars.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Aucun calendrier.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {[...userCalendars, ...systemCalendars].map((c) => (
                    <CalendarRow key={c.id} calendar={c} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function labelForStatus(s: string): string {
  return s === "committed"
    ? "ok"
    : s === "failed"
      ? "échec"
      : s === "parsed"
        ? "prêt"
        : "en cours"
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "committed"
      ? "bg-primary"
      : status === "failed"
        ? "bg-destructive"
        : status === "parsed"
          ? "bg-accent"
          : "bg-muted-foreground/50"
  return <span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden />
}
