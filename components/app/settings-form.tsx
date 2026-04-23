"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Toaster } from "@/components/ui/sonner"
import { updateSettings } from "@/app/actions/settings"
import type { HolidayMode, SchoolZone } from "@/lib/types"

interface Props {
  initial: {
    school_zone: SchoolZone
    holiday_mode: HolidayMode
    default_buffer_minutes: number
  }
}

export function SettingsForm({ initial }: Props) {
  const [zone, setZone] = useState<SchoolZone>(initial.school_zone)
  const [mode, setMode] = useState<HolidayMode>(initial.holiday_mode)
  const [buffer, setBuffer] = useState<number>(initial.default_buffer_minutes)
  const [isPending, startTransition] = useTransition()

  const onSave = () => {
    startTransition(async () => {
      try {
        await updateSettings({ school_zone: zone, holiday_mode: mode, default_buffer_minutes: buffer })
        toast.success("Préférences enregistrées", {
          description: "La détection des conflits a été recalculée.",
        })
      } catch {
        toast.error("Impossible d'enregistrer les préférences.")
      }
    })
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <Toaster position="bottom-right" />

      {/* Zone */}
      <div>
        <Label className="text-sm font-medium text-foreground">Zone scolaire</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Les vacances scolaires affichées et prises en compte suivent cette zone.
        </p>
        <RadioGroup
          value={zone}
          onValueChange={(v) => setZone(v as SchoolZone)}
          className="mt-3 grid grid-cols-3 gap-2"
        >
          {(["A", "B", "C"] as const).map((z) => (
            <label
              key={z}
              htmlFor={`zone-${z}`}
              className={[
                "flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors",
                zone === z ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary",
              ].join(" ")}
            >
              <RadioGroupItem id={`zone-${z}`} value={z} className="sr-only" />
              Zone {z}
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Mode */}
      <div>
        <Label className="text-sm font-medium text-foreground">Mode vacances scolaires</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Comment Constellation doit traiter les événements qui tombent pendant les vacances.
        </p>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as HolidayMode)}
          className="mt-3 space-y-2"
        >
          <ModeOption
            value="informational"
            label="Informatif"
            description="Affiche les vacances en arrière-plan sans générer de conflit."
            current={mode}
          />
          <ModeOption
            value="soft_block"
            label="Alerte souple"
            description="Signale un conflit modéré si un événement tombe pendant les vacances."
            current={mode}
          />
          <ModeOption
            value="hard_block"
            label="Blocage strict"
            description="Marque comme critique tout événement pendant les vacances."
            current={mode}
          />
        </RadioGroup>
      </div>

      {/* Buffer */}
      <div>
        <Label htmlFor="buffer" className="text-sm font-medium text-foreground">
          Buffer par défaut (minutes)
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Temps minimum entre deux événements consécutifs avant d&apos;être signalé comme conflit.
        </p>
        <Input
          id="buffer"
          type="number"
          min={0}
          max={240}
          step={5}
          value={buffer}
          onChange={(e) => setBuffer(Number(e.target.value))}
          className="mt-3 w-32"
        />
      </div>

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  )
}

function ModeOption({
  value,
  label,
  description,
  current,
}: {
  value: HolidayMode
  label: string
  description: string
  current: HolidayMode
}) {
  const selected = value === current
  return (
    <label
      htmlFor={`mode-${value}`}
      className={[
        "flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
      ].join(" ")}
    >
      <RadioGroupItem id={`mode-${value}`} value={value} className="mt-0.5" />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  )
}
