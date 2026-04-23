"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Link2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { commitIcsImport } from "@/app/actions/imports"

const COLOR_PALETTE = [
  "#0066B1", // BMW blue
  "#6BA8D8", // soft cyan
  "#D0494B", // alert red
  "#2F7D5B", // precise green
  "#B98A38", // amber
  "#6E6E6E", // neutral
]

type Mode = "url" | "file"

interface Result {
  eventCount: number
  rawEventCount: number
  errorCount: number
  conflictsDetected: number
  detectedCalendarName: string | null
}

export function IcsImportForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("url")
  const [url, setUrl] = useState("")
  const [fileName, setFileName] = useState<string>("")
  const [fileContent, setFileContent] = useState<string>("")
  const [calendarName, setCalendarName] = useState("")
  const [calendarColor, setCalendarColor] = useState(COLOR_PALETTE[0])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File) => {
    setError(null)
    if (!/\.(ics|ical|ifb)$/i.test(file.name)) {
      setError("Le fichier doit être au format .ics.")
      return
    }
    const text = await file.text()
    setFileName(file.name)
    setFileContent(text)
    if (!calendarName) setCalendarName(file.name.replace(/\.ics$/i, ""))
  }

  const submit = () => {
    setError(null)
    if (mode === "url" && !url.trim()) {
      setError("Collez une URL iCal.")
      return
    }
    if (mode === "file" && !fileContent) {
      setError("Sélectionnez un fichier .ics.")
      return
    }
    startTransition(async () => {
      try {
        const res = await commitIcsImport({
          source:
            mode === "url"
              ? { kind: "url", url: url.trim() }
              : { kind: "text", content: fileContent, filename: fileName },
          calendarName,
          calendarColor,
        })
        setResult({
          eventCount: res.eventCount,
          rawEventCount: res.rawEventCount,
          errorCount: res.errorCount,
          conflictsDetected: res.conflictsDetected,
          detectedCalendarName: res.detectedCalendarName,
        })
        if (!calendarName && res.detectedCalendarName) setCalendarName(res.detectedCalendarName)
      } catch (err) {
        console.log("[v0] ics import failed:", err)
        setError(err instanceof Error ? err.message : "L'import a échoué.")
      }
    })
  }

  if (result) {
    const displayName = calendarName || result.detectedCalendarName || "Agenda iCal"
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Check className="size-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Import iCal terminé</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Le calendrier « {displayName} » a été créé.
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border text-center">
            <Stat dt="Événements" dd={result.eventCount} />
            <Stat
              dt="Erreurs"
              dd={result.errorCount}
              tone={result.errorCount > 0 ? "destructive" : "neutral"}
            />
            <Stat
              dt="Conflits"
              dd={result.conflictsDetected}
              tone={result.conflictsDetected > 0 ? "destructive" : "neutral"}
            />
          </dl>
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            {result.rawEventCount} entrée{result.rawEventCount > 1 ? "s" : ""} VEVENT dans le flux ·
            {" "}récurrences étendues sur ±1 an
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push("/app/calendar")}>
              Voir l&apos;agenda
            </Button>
            {result.conflictsDetected > 0 ? (
              <Button onClick={() => router.push("/app/conflicts")}>Arbitrer les conflits</Button>
            ) : (
              <Button onClick={() => router.push("/app")}>Retour au tableau de bord</Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Mode switch */}
      <div className="inline-flex rounded-md border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded-sm px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors ${
            mode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link2 className="mr-1 inline size-3.5" />
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`rounded-sm px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors ${
            mode === "file" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="mr-1 inline size-3.5" />
          Fichier
        </button>
      </div>

      {mode === "url" ? (
        <div className="rounded-md border border-border bg-card p-6">
          <Label htmlFor="ics-url" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            URL secrète iCal (Google Agenda)
          </Label>
          <Input
            id="ics-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            className="mt-2 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <GoogleHelp />
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-secondary">
            <Upload className="size-6 text-primary" />
          </div>
          <h2 className="text-lg font-medium">Déposez un fichier .ics</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Export iCalendar depuis Google Agenda, Apple Calendar, Outlook, etc.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,.ifb,text/calendar"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button className="mt-4" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Choisir un fichier
          </Button>
          {fileName && (
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              {fileName} · {Math.round(fileContent.length / 1024)} Ko
            </p>
          )}
        </div>
      )}

      <div className="rounded-md border border-border bg-card p-6 space-y-4">
        <div>
          <Label htmlFor="ics-name" className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Nom du calendrier
          </Label>
          <Input
            id="ics-name"
            value={calendarName}
            onChange={(e) => setCalendarName(e.target.value)}
            className="mt-2"
            placeholder="Laisser vide pour utiliser le nom détecté"
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
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={isPending} size="lg">
          {isPending ? "Import en cours…" : "Importer"}
        </Button>
      </div>
    </div>
  )
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

function GoogleHelp() {
  return (
    <details className="mt-4 rounded-md border border-border bg-secondary/30 px-4 py-3 text-sm">
      <summary className="cursor-pointer select-none text-sm font-medium">
        Comment obtenir l&apos;URL secrète depuis Google Agenda ?
      </summary>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
        <li>Ouvrez Google Agenda dans un navigateur.</li>
        <li>
          Dans la colonne de gauche, passez la souris sur l&apos;agenda à importer, cliquez sur les trois points puis{" "}
          <span className="font-medium text-foreground">Paramètres et partage</span>.
        </li>
        <li>
          Faites défiler jusqu&apos;à <span className="font-medium text-foreground">Adresse secrète au format iCal</span>.
        </li>
        <li>Copiez l&apos;URL (elle se termine par <code className="font-mono text-xs">basic.ics</code>) et collez-la ci-dessus.</li>
      </ol>
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        L&apos;URL reste privée. Ne la partagez pas publiquement.
      </p>
    </details>
  )
}
