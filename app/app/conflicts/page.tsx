import { CheckCircle2, GitMerge } from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { getEventsByIds, listAllConflicts, listCalendars } from "@/lib/queries"
import { ConflictCard } from "@/components/app/conflict-card"
import { DetectButton } from "@/components/app/detect-button"

export const dynamic = "force-dynamic"

export default async function ConflictsPage() {
  const [conflicts, calendars] = await Promise.all([listAllConflicts(), listCalendars()])
  const allEventIds = Array.from(new Set(conflicts.flatMap((c) => c.event_ids)))
  const events = await getEventsByIds(allEventIds)
  const eventMap = new Map(events.map((e) => [e.id, e]))
  const calMap = new Map(calendars.map((c) => [c.id, c]))

  const open = conflicts.filter((c) => c.status === "open")
  const resolved = conflicts.filter((c) => c.status !== "open")

  return (
    <>
      <PageHeader
        eyebrow="Conflits"
        title={
          open.length === 0
            ? "Aucun conflit ouvert"
            : `${open.length} conflit${open.length > 1 ? "s" : ""} à arbitrer`
        }
        description="Le moteur détecte les chevauchements, les buffers trop courts, les heures non travaillées et les collisions avec les vacances scolaires."
        actions={<DetectButton />}
      />

      <section className="px-6 py-6 md:px-8 md:py-8">
        {open.length === 0 ? (
          <div className="rounded-md border border-border bg-card">
            <Empty className="p-12">
              <EmptyHeader>
                <CheckCircle2 className="mb-2 size-8 text-primary" />
                <EmptyTitle>Tout est en ordre</EmptyTitle>
                <EmptyDescription>
                  Aucun conflit ouvert. Importez un nouveau CSV ou modifiez vos réglages pour relancer la détection.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="grid gap-4">
            {open.map((c) => (
              <ConflictCard key={c.id} conflict={c} eventMap={eventMap} calendarMap={calMap} />
            ))}
          </div>
        )}

        {resolved.length > 0 && (
          <div className="mt-12">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GitMerge className="size-4" /> Historique ({resolved.length})
            </h2>
            <div className="mt-3 grid gap-3">
              {resolved.map((c) => (
                <ConflictCard
                  key={c.id}
                  conflict={c}
                  eventMap={eventMap}
                  calendarMap={calMap}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
