import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  withWordmark?: boolean
}

// Constellation Lite brand mark: three connected nodes forming a small constellation.
// Kept deliberately minimal to match the BMW-inspired precision brief.
export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="4" cy="7" r="2" className="fill-primary" />
        <circle cx="17" cy="4" r="1.6" className="fill-accent" />
        <circle cx="13" cy="17" r="2" className="fill-primary" />
        <path
          d="M4 7 L17 4 M17 4 L13 17 M4 7 L13 17"
          className="stroke-foreground/25"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Constellation <span className="text-muted-foreground font-normal">Lite</span>
        </span>
      )}
    </div>
  )
}
