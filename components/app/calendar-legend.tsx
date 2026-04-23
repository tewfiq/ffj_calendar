import type { Calendar } from "@/lib/types"

export function CalendarLegend({ calendars }: { calendars: Calendar[] }) {
  const userCals = calendars.filter((c) => !c.is_system && c.is_enabled)
  const systemCals = calendars.filter((c) => c.is_system && c.is_enabled)

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      {userCals.length === 0 && systemCals.length === 0 && (
        <span className="text-muted-foreground">Aucun calendrier actif.</span>
      )}
      {userCals.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: c.color ?? "var(--primary)" }}
            aria-hidden
          />
          <span className="text-foreground">{c.name}</span>
        </span>
      ))}
      {systemCals.length > 0 && (
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-accent/40" aria-hidden />
          <span className="text-muted-foreground">Vacances scolaires</span>
        </span>
      )}
    </div>
  )
}
