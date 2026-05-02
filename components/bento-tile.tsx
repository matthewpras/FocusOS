import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type BentoTileProps = {
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
  glow?: "blue" | "violet"
}

export function BentoTile({
  title,
  eyebrow,
  children,
  className,
  glow = "blue",
}: BentoTileProps) {
  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-md",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full opacity-25 blur-3xl transition-opacity group-hover:opacity-40",
          glow === "blue" ? "bg-[var(--accent-blue)]" : "bg-[var(--accent-violet)]",
        )}
      />
      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-white/40">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="relative">{children}</div>
    </section>
  )
}
