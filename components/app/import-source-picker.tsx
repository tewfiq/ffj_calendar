"use client"

import { useState } from "react"
import { FileText, CalendarDays } from "lucide-react"
import { ImportWizard } from "@/components/app/import-wizard"
import { IcsImportForm } from "@/components/app/ics-import-form"

type Source = "csv" | "ics"

export function ImportSourcePicker() {
  const [source, setSource] = useState<Source>("csv")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <TabButton
          active={source === "csv"}
          onClick={() => setSource("csv")}
          icon={<FileText className="size-4" />}
          label="CSV"
          hint="tableur, export manuel"
        />
        <TabButton
          active={source === "ics"}
          onClick={() => setSource("ics")}
          icon={<CalendarDays className="size-4" />}
          label="iCal / Google Agenda"
          hint="URL secrète ou fichier .ics"
        />
      </div>

      {source === "csv" ? <ImportWizard /> : <IcsImportForm />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md border px-4 py-2.5 text-left transition-colors ${
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
      aria-pressed={active}
    >
      <span
        className={`inline-flex size-8 items-center justify-center rounded-sm ${
          active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        }`}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-[11px] uppercase tracking-wider opacity-70">{hint}</span>
      </span>
    </button>
  )
}
