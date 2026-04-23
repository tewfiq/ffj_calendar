"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, FileText, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { parseCsv, guessMapping } from "@/lib/csv"
import { CSV_TARGET_FIELDS, type CsvTargetField } from "@/lib/types"
import { commitCsvImport } from "@/app/actions/imports"

type Phase = "upload" | "configure" | "done"

const REQUIRED_FIELDS: CsvTargetField[] = ["title", "start_at"]
const COLOR_PALETTE = [
  "#0066B1", // BMW blue
  "#6BA8D8", // soft cyan
  "#D0494B", // alert red
  "#2F7D5B", // precise green
  "#B98A38", // amber
  "#6E6E6E", // neutral
]

export function ImportWizard() {
  const [phase, setPhase] = useState<Phase>("upload")
  const [filename, setFilename] = useState<string>("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [calendarName, setCalendarName] = useState("")
  const [calendarColor, setCalendarColor] = useState(COLOR_PALETTE[0])
  const [mapping, setMapping] = useState<Partial<Record<CsvTargetField, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ eventCount: number; errorCount: number; conflictsDetected: number } | null>(
    null,
  )
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewRows = useMemo(() => {
    return rows.slice(0, 6).map((row) => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => (obj[h] = row[i] ?? ""))
      return obj
    })
  }, [rows, headers])

  const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f])

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Le fichier doit être au format .csv.")
      return
    }
    const text = await file.text()
    const parsed = parseCsv(text)
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setError("Fichier vide ou illisible.")
      return
    }
    setFilename(file.name)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setMapping(guessMapping(parsed.headers))
    setCalendarName(file.name.replace(/\.csv$/i, ""))
    setPhase("configure")
  }

  const onCommit = () => {
    if (missingRequired.length > 0) {
      setError(`Les champs requis ne sont pas mappés : ${missingRequired.join(", ")}.`)
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const payload = {
          filename,
          calendarName,
          calendarColor,
          mapping,
          rows: rows.map((row) => {
            const obj: Record<string, string> = {}
            headers.forEach((h, i) => (obj[h] = row[i] ?? ""))
            return obj
          }),
        }
        const res = await commitCsvImport(payload)
        setResult({
          eventCount: res.eventCount,
          errorCount: res.errorCount,
          conflictsDetected: res.conflictsDetected,
        })
        setPhase("done")
      } catch (err) {
        console.log("[v0] commit failed:", err)
        setError("L'import a échoué. Vérifiez votre fichier et réessayez.")
      }
    })
  }

  if (phase === "done" && result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="size-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Import terminé</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Le calendrier « {calendarName} » a été créé.
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border text-center">
            <Stat dt="Événements" dd={result.eventCount} />
            <Stat dt="Erreurs" dd={result.errorCount} tone={result.errorCount > 0 ? "destructive" : "neutral"} />
            <Stat
              dt="Conflits détectés"
              dd={result.conflictsDetected}
              tone={result.conflictsDetected > 0 ? "destructive" : "neutral"}
            />
          </dl>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push("/app/calendar")}>
              Voir l&apos;agenda
            </Button>
            {result.conflictsDetected > 0 ? (
              <Button onClick={() => router.push("/app/conflicts")}>Arbitrer les conflits</Button>
            ) : (
              <Button onClick={() => router.push("/")}>Retour au tableau de bord</Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (phase === "upload") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-secondary">
            <Upload className="size-6 text-primary" />
          </div>
          <h2 className="text-lg font-medium">Déposez votre fichier CSV</h2>
          <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            Colonnes reconnues automatiquement : titre, début, fin, lieu, description, priorité.
            Le séparateur est la virgule.
          </p>
          <div className="mt-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button size="lg" onClick={() => fileInputRef.current?.click()}>
              <FileText className="mr-2 size-4" />
              Choisir un fichier
            </Button>
          </div>
          <p className="mt-6 font-mono text-[11px] text-muted-foreground">
            Un fichier = un calendrier.
          </p>
        </div>

        {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

        <ExampleCsv />
      </div>
    )
  }

  // configure
  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h2 className="text-base font-medium tracking-tight">Calendrier</h2>
        <p className="mt-1 text-sm text-muted-foreground">Comment voulez-vous nommer cet agenda ?</p>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="cal-name" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Nom
            </Label>
            <Input
              id="cal-name"
              value={calendarName}
              onChange={(e) => setCalendarName(e.target.value)}
              className="mt-1"
              placeholder="Travail, Famille, Sport…"
            />
          </div>
          <div>
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Couleur</Label>
            <div className="mt-2 flex gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCalendarColor(c)}
                  className="size-7 rounded-full border border-border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: calendarColor === c ? "2px solid var(--ring)" : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-secondary/40 px-4 py-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Fichier</p>
            <p className="mt-1 truncate text-sm">{filename}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {rows.length} ligne{rows.length > 1 ? "s" : ""} détectée{rows.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3">
        <h2 className="text-base font-medium tracking-tight">Correspondance des colonnes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assignez vos colonnes source aux champs canoniques. Les champs « titre » et « début » sont obligatoires.
        </p>

        <div className="mt-4 space-y-3 rounded-md border border-border bg-card p-4">
          {CSV_TARGET_FIELDS.map((field) => (
            <div key={field} className="flex items-center gap-3">
              <Label className="w-28 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {labelFor(field)}
                {REQUIRED_FIELDS.includes(field) && <span className="text-destructive"> *</span>}
              </Label>
              <Select
                value={mapping[field] ?? "__none__"}
                onValueChange={(v) =>
                  setMapping((prev) => ({ ...prev, [field]: v === "__none__" ? undefined : v }))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Non mappé" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Non mappé —</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-sm font-medium tracking-tight">Aperçu</h3>
        <div className="mt-2 overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {previewRows.map((row, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h} className="whitespace-nowrap px-3 py-2 text-foreground">
                      {row[h] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setPhase("upload")} disabled={isPending}>
            Recommencer
          </Button>
          <Button onClick={onCommit} disabled={isPending || missingRequired.length > 0}>
            {isPending ? "Import en cours…" : `Importer ${rows.length} événements`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function labelFor(field: CsvTargetField): string {
  const map: Record<CsvTargetField, string> = {
    title: "titre",
    start_at: "début",
    end_at: "fin",
    all_day: "journée",
    location: "lieu",
    description: "description",
    priority: "priorité",
    movable: "déplaçable",
    category: "catégorie",
    timezone: "fuseau",
  }
  return map[field]
}

function Stat({
  dt,
  dd,
  tone = "neutral",
}: {
  dt: string
  dd: number
  tone?: "neutral" | "destructive"
}) {
  return (
    <div className="bg-card p-4">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{dt}</dt>
      <dd
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {dd}
      </dd>
    </div>
  )
}

function ExampleCsv() {
  const example =
    "title,start_at,end_at,all_day,location,priority\nRevue produit,2026-03-16T09:30:00,2026-03-16T10:30:00,false,Salle Mars,high\nPédiatre - Jules,2026-03-16T10:15:00,2026-03-16T11:00:00,false,Cabinet,medium\nEntraînement,2026-03-17T18:30:00,2026-03-17T20:00:00,false,Stade,low\n"
  const onDownload = () => {
    const blob = new Blob([example], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "constellation-exemple.csv"
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="mt-6 rounded-md border border-border bg-secondary/30 px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Besoin d&apos;un exemple ?</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            Fichier CSV avec les colonnes attendues.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onDownload}>
          Télécharger
        </Button>
      </div>
    </div>
  )
}
