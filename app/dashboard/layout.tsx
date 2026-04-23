import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarRange, GitMerge, LayoutDashboard, Settings, Upload } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { NavLink } from "@/components/app/nav-link"

// App shell — sidebar + content.
// Kept sparse and technical in the BMW-inspired brief.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="border-b border-sidebar-border px-5 py-4">
          <Link href="/" aria-label="Accueil">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            <li>
              <NavLink href="/" icon={<LayoutDashboard className="size-4" />} exact>
                Tableau de bord
              </NavLink>
            </li>
            <li>
              <NavLink href="/calendar" icon={<CalendarRange className="size-4" />}>
                Calendrier
              </NavLink>
            </li>
            <li>
              <NavLink href="/conflicts" icon={<GitMerge className="size-4" />}>
                Conflits
              </NavLink>
            </li>
            <li>
              <NavLink href="/imports" icon={<Upload className="size-4" />}>
                Imports
              </NavLink>
            </li>
            <li>
              <NavLink href="/settings" icon={<Settings className="size-4" />}>
                Réglages
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className="border-t border-sidebar-border px-5 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Monoposte · fr-FR
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/" aria-label="Accueil">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Bureau
            </Link>
            <Link
              href="/calendar"
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Agenda
            </Link>
            <Link
              href="/conflicts"
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Conflits
            </Link>
            <Link
              href="/imports"
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Imports
            </Link>
          </nav>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
