"use client"

import type { CompactCalendarDay } from "@/lib/today-home"
import { cn } from "@/lib/utils"

type CompactWeekCalendarProps = {
  days: CompactCalendarDay[]
  onSelectEvent?: (id: string) => void
}

const toneClass = {
  blue: "border-[oklch(0.74_0.12_255)] bg-[oklch(0.96_0.025_250)] text-[oklch(0.34_0.16_258)]",
  violet: "border-[oklch(0.78_0.12_302)] bg-[oklch(0.97_0.026_302)] text-[oklch(0.39_0.15_302)]",
  green: "border-[oklch(0.78_0.11_155)] bg-[oklch(0.97_0.024_155)] text-[oklch(0.34_0.12_155)]",
  amber: "border-[oklch(0.82_0.12_80)] bg-[oklch(0.98_0.028_80)] text-[oklch(0.42_0.12_72)]",
}

export function CompactWeekCalendar({
  days,
  onSelectEvent,
}: CompactWeekCalendarProps) {
  return (
    <section
      aria-labelledby="today-calendar-heading"
      className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-3 text-[var(--today-ink)]"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 id="today-calendar-heading" className="text-sm font-semibold">
            Calendar
          </h2>
          <p className="text-xs text-[var(--today-muted)]">Next five days</p>
        </div>
      </div>

      <div className="-mx-3 overflow-x-auto px-3 pb-1">
        <div className="grid min-w-[42rem] grid-cols-5 gap-2 lg:min-w-0">
          {days.map((day) => (
            <div
              key={day.date.toISOString()}
              className="min-h-40 rounded-md border border-[var(--today-line)] bg-[oklch(0.985_0.006_244)] p-2"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs font-medium text-[var(--today-muted)]">
                  {day.label}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {day.dayNumber}
                </span>
              </div>
              <div className="space-y-1.5">
                {day.events.length ? (
                  day.events.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent?.(event.id)}
                      className={cn(
                        "w-full rounded-md border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--today-blue)]",
                        toneClass[event.tone],
                      )}
                    >
                      <span className="block truncate text-[11px] font-semibold">
                        {event.timeLabel}
                      </span>
                      <span className="block truncate text-xs">{event.title}</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-[var(--today-line)] px-2 py-6 text-center text-xs text-[var(--today-muted)]">
                    Open
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
