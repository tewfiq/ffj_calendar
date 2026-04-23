"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { deleteCalendar, toggleCalendar } from "@/app/actions/imports"
import type { Calendar } from "@/lib/types"

export function CalendarRow({ calendar }: { calendar: Calendar }) {
  const [enabled, setEnabled] = useState(calendar.is_enabled)
  const [isPending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const onToggle = (value: boolean) => {
    setEnabled(value)
    startTransition(async () => {
      try {
        await toggleCalendar(calendar.id, value)
      } catch {
        setEnabled(!value)
      }
    })
  }

  const onDelete = () => {
    startTransition(async () => {
      try {
        await deleteCalendar(calendar.id)
      } catch (e) {
        console.log("[v0] deleteCalendar failed:", e)
      }
    })
  }

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: calendar.color ?? "var(--primary)" }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{calendar.name}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {labelSource(calendar.source_type)}
          {calendar.school_zone ? ` · Zone ${calendar.school_zone}` : ""}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={isPending}
        aria-label={`Activer ${calendar.name}`}
      />
      {!calendar.is_system && (
        confirmingDelete ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)} disabled={isPending}>
              Annuler
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={isPending}>
              Confirmer
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmingDelete(true)}
            disabled={isPending}
            aria-label="Supprimer le calendrier"
          >
            <Trash2 className="size-4" />
          </Button>
        )
      )}
    </li>
  )
}

function labelSource(t: string): string {
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
