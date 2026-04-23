import Link from "next/link"
import { ArrowRight, CalendarRange, FileSpreadsheet, Layers, ShieldCheck, Sparkles, GitMerge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Fonctionnalités
            </a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">
              Comment ça marche
            </a>
            <a href="#principles" className="text-sm text-muted-foreground hover:text-foreground">
              Principes
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link href="/app">Ouvrir l&apos;application</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app">
                Commencer
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 font-mono text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              V1 · Français · Monoposte
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
              Fusionnez vos agendas.{" "}
              <span className="text-muted-foreground">Résolvez les conflits en un clic.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Constellation Lite importe tous vos calendriers via CSV, détecte les chevauchements,
              tient compte des vacances scolaires françaises, et vous propose des créneaux alternatifs
              priorisés — sans négocier votre attention.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/app">
                  Importer mon premier CSV
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/app/calendar">Voir la démo</Link>
              </Button>
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              Aucune intégration externe. Import CSV uniquement. Vos données restent sous votre contrôle.
            </p>
          </div>

          {/* Visual proof strip */}
          <div className="md:col-span-5">
            <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-destructive/60" />
                  <span className="size-2 rounded-full bg-accent/70" />
                  <span className="size-2 rounded-full bg-primary/60" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  semaine 12 · mars 2026
                </span>
              </div>
              <div className="divide-y divide-border">
                <MockRow
                  day="lun. 16"
                  title="Revue produit Q1"
                  cal="Travail"
                  time="09:30 – 10:30"
                  tone="primary"
                />
                <MockRow
                  day="lun. 16"
                  title="Pédiatre — Jules"
                  cal="Famille"
                  time="10:15 – 11:00"
                  tone="destructive"
                  conflict
                />
                <MockRow
                  day="mar. 17"
                  title="Entraînement demi-fond"
                  cal="Sport"
                  time="18:30 – 20:00"
                  tone="accent"
                />
                <MockRow
                  day="mer. 18"
                  title="Vacances scolaires — Zone C"
                  cal="École"
                  time="Journée entière"
                  tone="muted"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                  1 conflit détecté
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  2 suggestions
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">Fonctionnalités</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Un copilote sobre, pensé pour la planification française.
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
            <FeatureCard
              icon={<FileSpreadsheet className="size-5" />}
              title="Import CSV universel"
              body="Uploadez un fichier, mappez les colonnes, prévisualisez, puis confirmez. Chaque CSV devient un calendrier."
            />
            <FeatureCard
              icon={<Layers className="size-5" />}
              title="Vue unifiée"
              body="Tous vos calendriers sur une seule grille — travail, famille, école, sport — avec codes couleur cohérents."
            />
            <FeatureCard
              icon={<GitMerge className="size-5" />}
              title="Détection de conflits"
              body="Chevauchements stricts, buffers trop courts, créneaux hors heures de travail — tout est signalé."
            />
            <FeatureCard
              icon={<CalendarRange className="size-5" />}
              title="Vacances scolaires FR"
              body="Zones A, B, C préchargées. Signalez en mode informatif, souple, ou strict selon vos besoins."
            />
            <FeatureCard
              icon={<Sparkles className="size-5" />}
              title="Explications naturelles"
              body="Chaque conflit est résumé en français clair : ce qui cloche, pourquoi, et quoi faire."
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" />}
              title="Zéro lock-in"
              body="Pas d'intégration Google ou Outlook. Vos données dans un CSV, exportables à tout moment."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">Parcours</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Trois étapes. Pas de surprise.
            </h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            <Step
              n="01"
              title="Importez"
              body="Exportez votre calendrier en CSV depuis n'importe quelle source, puis déposez-le dans Constellation."
            />
            <Step
              n="02"
              title="Fusionnez"
              body="Un calendrier par import. La vue unifiée empile tout sur une même grille cohérente."
            />
            <Step
              n="03"
              title="Arbitrez"
              body="Le moteur détecte les conflits, propose des créneaux alternatifs, et vous gardez toujours le dernier mot."
            />
          </ol>
        </div>
      </section>

      {/* Principles */}
      <section id="principles" className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">Principes</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Un outil qui ne vole pas votre attention.
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">
              Pas de notifications intempestives. Pas d&apos;intégrations opaques. Pas d&apos;IA qui
              décide à votre place. Constellation Lite vous présente l&apos;information, calcule les
              options, et attend votre décision.
            </p>
          </div>
          <ul className="space-y-4 text-sm leading-relaxed text-foreground">
            <Principle text="Le calendrier est un objet partagé — vous voyez exactement ce que voit le moteur." />
            <Principle text="Chaque recommandation est déterministe et traçable. L'IA n'explique, ne décide jamais." />
            <Principle text="Les vacances scolaires ne sont pas négociables : le moteur les respecte par défaut." />
            <Principle text="Import et export CSV. Aucune donnée captive." />
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
            Prêt à reprendre le contrôle de votre semaine ?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Monoposte. Français. Sans compte. Sans intégration.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/app">
                Ouvrir Constellation Lite
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center">
          <Logo />
          <p className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} Constellation Lite · V1 monoposte · fr-FR · Europe/Paris
          </p>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col gap-3 bg-card p-6">
      <span className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-secondary/70 text-primary">
        {icon}
      </span>
      <h3 className="text-base font-medium tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-md border border-border bg-card p-6">
      <span className="font-mono text-xs uppercase tracking-widest text-primary">{n}</span>
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  )
}

function Principle({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-2 block size-1.5 shrink-0 rounded-full bg-primary" />
      <span>{text}</span>
    </li>
  )
}

function MockRow({
  day,
  title,
  cal,
  time,
  tone,
  conflict,
}: {
  day: string
  title: string
  cal: string
  time: string
  tone: "primary" | "destructive" | "accent" | "muted"
  conflict?: boolean
}) {
  const toneMap = {
    primary: "bg-primary",
    destructive: "bg-destructive",
    accent: "bg-accent",
    muted: "bg-muted-foreground/40",
  }
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {day}
      </span>
      <span className={`size-2 shrink-0 rounded-full ${toneMap[tone]}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {cal} · {time}
        </p>
      </div>
      {conflict && (
        <span className="rounded-sm border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-destructive">
          conflit
        </span>
      )}
    </div>
  )
}
