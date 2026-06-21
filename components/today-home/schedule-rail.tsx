"use client"

import { Clock3 } from "lucide-react"
import type { FocusPressure, ScheduleRow } from "@/lib/today-home"
import { formatFocusMinutes } from "@/lib/today-home"
import { cn } from "@/lib/utils"

type ScheduleRailProps = {
  pressure: FocusPressure
  scheduleRows: ScheduleRow[]
}

export function ScheduleRail({ pressure, scheduleRows }: ScheduleRailProps) {
  const highPressure = pressure.label === "High Focus Needed"

  return (
    <aside className="space-y-3 text-[var(--today-ink)]">
      <section
        aria-label="Focus pressure"
        className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                highPressure ? "text-[var(--today-red)]" : "text-[var(--today-ink)]",
              )}
            >
              {pressure.label}
            </p>
            <p className="mt-1 text-xs text-[var(--today-muted)]">
              {formatFocusMinutes(pressure.availableFocusMinutes)} available
            </p>
          </div>
          <div
            className="grid size-16 place-items-center rounded-full"
            style={{
              background: `conic-gradient(${highPressure ? "var(--today-red)" : "var(--today-blue)"} ${pressure.score}%, oklch(0.9 0.012 252) 0)`,
            }}
          >
            <div className="grid size-12 place-items-center rounded-full bg-white text-sm font-semibold tabular-nums">
              {pressure.score}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--today-muted)]">
          Score blends overdue work, today tasks, calendar density, and inbox pressure.
        </p>
      </section>

      <section
        aria-labelledby="today-schedule-heading"
        className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)]"
      >
        <div className="border-b border-[var(--today-line)] px-4 py-3">
          <h2 id="today-schedule-heading" className="text-sm font-semibold">
            Schedule
          </h2>
          <p className="text-xs text-[var(--today-muted)]">Next commitments</p>
        </div>
        {scheduleRows.length ? (
          <ol className="divide-y divide-[var(--today-line)]">
            {scheduleRows.map((row) => (
              <li key={row.id} className="flex gap-3 px-4 py-3">
                <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-[oklch(0.95_0.018_250)] text-[var(--today-blue)]">
                  <Clock3 className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tabular-nums text-[var(--today-muted)]">
                    {row.timeLabel}
                  </p>
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="truncate text-xs text-[var(--today-muted)]">
                    {row.note}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-4 py-8 text-sm text-[var(--today-muted)]">
            No calendar commitments found for the next window.
          </div>
        )}
      </section>
    </aside>
  )
}
