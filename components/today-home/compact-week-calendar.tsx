"use client"

import type { CompactCalendarDay } from "@/lib/today-home"
import { cn } from "@/lib/utils"

type CompactWeekCalendarProps = {
  days: CompactCalendarDay[]
  onSelectEvent?: (id: string) => void
}

const toneClass = {
  blue: "border-[oklch(0.63_0.14_255/0.55)] bg-[oklch(0.24_0.07_255)] text-[oklch(0.86_0.07_245)]",
  violet: "border-[oklch(0.68_0.14_302/0.55)] bg-[oklch(0.24_0.064_302)] text-[oklch(0.88_0.07_302)]",
  green: "border-[oklch(0.68_0.11_155/0.55)] bg-[oklch(0.23_0.052_155)] text-[oklch(0.86_0.07_155)]",
  amber: "border-[oklch(0.72_0.12_80/0.55)] bg-[oklch(0.25_0.055_80)] text-[oklch(0.88_0.08_80)]",
}

export function CompactWeekCalendar({
  days,
  onSelectEvent,
}: CompactWeekCalendarProps) {
  return (
    <section
      aria-labelledby="today-calendar-heading"
      className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-3 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]"
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
              className="min-h-40 rounded-md border border-[var(--today-line)] bg-[var(--today-panel)] p-2"
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
                  <div className="rounded-md border border-dashed border-white/16 bg-black/10 px-2 py-6 text-center text-xs text-[var(--today-muted)]">
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
