"use client"

import { useState, useTransition } from "react"
import { Sparkles, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { explainConflict, updateConflictStatus } from "@/app/actions/conflicts"
import { formatRangeFr } from "@/lib/dates"
import type { Calendar, Conflict, Event } from "@/lib/types"

interface Props {
  conflict: Conflict
  eventMap: Map<string, Event>
  calendarMap: Map<string, Calendar>
  compact?: boolean
}

export function ConflictCard({ conflict, eventMap, calendarMap, compact = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isExplaining, setIsExplaining] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(conflict.explanation)

  const events = conflict.event_ids.map((id) => eventMap.get(id)).filter((e): e is Event => Boolean(e))

  const severityClasses =
    conflict.severity === "critical"
      ? "border-destructive/30 bg-destructive/5"
      : conflict.severity === "medium"
        ? "border-accent/40 bg-accent/5"
        : "border-border bg-card"

  const severityLabel = conflict.severity === "critical" ? "Critique" : conflict.severity === "medium" ? "Moyen" : "Faible"
  const typeLabel = labelForType(conflict.type)

  const onExplain = () => {
    setIsExplaining(true)
    startTransition(async () => {
      try {
        const text = await explainConflict(conflict.id)
        setExplanation(text)
      } finally {
        setIsExplaining(false)
      }
    })
  }

  const onMark = (status: "resolved" | "ignored") => {
    startTransition(async () => {
      await updateConflictStatus(conflict.id, status)
    })
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 rounded-md border border-border bg-card px-5 py-3">
        <span
          className={`size-2 shrink-0 rounded-full ${
            conflict.status === "resolved" ? "bg-primary" : "bg-muted-foreground/60"
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-foreground">
            {events.map((e) => `« ${e.title} »`).join(" · ")}
          </p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            {typeLabel} · {conflict.status === "resolved" ? "résolu" : "ignoré"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <article className={`rounded-md border ${severityClasses} p-5`}>
      <header className="flex flex-wrap items-center gap-2">
        <span className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {typeLabel}
        </span>
        <span
          className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
            conflict.severity === "critical"
              ? "bg-destructive text-destructive-foreground"
              : conflict.severity === "medium"
                ? "bg-accent/20 text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
          }`}
        >
          {severityLabel}
        </span>
      </header>

      <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-background">
        {events.map((e) => {
          const cal = calendarMap.get(e.calendar_id)
          return (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: cal?.color ?? "var(--primary)" }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {cal?.name ?? "—"} · {formatRangeFr(e.start_at, e.end_at, e.all_day)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 rounded-md border border-border bg-background p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Explication</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {explanation ?? "Aucune explication générée pour le moment."}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onExplain} disabled={isPending || isExplaining}>
            {isExplaining ? <Spinner className="mr-2 size-3" /> : <Sparkles className="mr-1 size-4" />}
            {explanation ? "Régénérer avec l'IA" : "Expliquer avec l'IA"}
          </Button>
          <p className="font-mono text-[10px] text-muted-foreground">
            Générée par OpenRouter · modèle au choix dans vos variables d&apos;env
          </p>
        </div>
      </div>

      <footer className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onMark("ignored")} disabled={isPending}>
          <X className="mr-1 size-4" />
          Ignorer
        </Button>
        <Button variant="outline" size="sm" onClick={() => onMark("resolved")} disabled={isPending}>
          <Check className="mr-1 size-4" />
          Marquer comme résolu
        </Button>
      </footer>
    </article>
  )
}

function labelForType(t: string): string {
  switch (t) {
    case "strict_overlap":
      return "Chevauchement"
    case "buffer_violation":
      return "Buffer insuffisant"
    case "school_holiday_violation":
      return "Vacances scolaires"
    case "working_hours_violation":
      return "Hors heures"
    case "priority_violation":
      return "Priorité"
    default:
      return t
  }
}
