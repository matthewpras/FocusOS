"use client"

import { addDays, format, isSameDay, isToday } from "date-fns"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ExternalCommitment } from "@/types"

type WeekCalendarGridProps = {
  weekStart: Date
  events: ExternalCommitment[]
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onDismiss: (id: string) => void
}

const TONE_CLASSES = [
  "border-[oklch(0.63_0.14_255/0.55)] bg-[oklch(0.24_0.07_255)] text-[oklch(0.86_0.07_245)]",
  "border-[oklch(0.68_0.14_302/0.55)] bg-[oklch(0.24_0.064_302)] text-[oklch(0.88_0.07_302)]",
  "border-[oklch(0.68_0.11_155/0.55)] bg-[oklch(0.23_0.052_155)] text-[oklch(0.86_0.07_155)]",
  "border-[oklch(0.72_0.12_80/0.55)] bg-[oklch(0.25_0.055_80)] text-[oklch(0.88_0.08_80)]",
]

function toneClass(index: number) {
  return TONE_CLASSES[index % TONE_CLASSES.length]
}

export function WeekCalendarGrid({
  weekStart,
  events,
  onPrevWeek,
  onNextWeek,
  onToday,
  onDismiss,
}: WeekCalendarGridProps) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  return (
    <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </p>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onToday}>
            Today
          </Button>
          <Button size="icon" variant="ghost" aria-label="Previous week" className="size-11" onClick={onPrevWeek}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Next week" className="size-11" onClick={onNextWeek}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="grid min-w-[56rem] grid-cols-7 gap-2 lg:min-w-0">
          {days.map((day) => {
            const dayEvents = events
              .filter((event) => event.starts_at && isSameDay(new Date(event.starts_at), day))
              .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""))

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-64 rounded-md border p-2",
                  isToday(day)
                    ? "border-[var(--today-blue)]/60 bg-[var(--today-panel)]"
                    : "border-[var(--today-line)] bg-[var(--today-panel)]",
                )}
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-[var(--today-muted)]">{format(day, "EEE")}</span>
                  <span
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      isToday(day) && "text-[var(--today-blue)]",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayEvents.length ? (
                    dayEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className={cn("group relative rounded-md border px-2 py-1.5 text-left", toneClass(index))}
                      >
                        <button
                          type="button"
                          aria-label={`Dismiss ${event.title}`}
                          className="absolute right-0.5 top-0.5 grid size-6 place-items-center rounded opacity-0 outline-none transition-opacity hover:bg-black/20 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--today-blue)] group-hover:opacity-100 group-focus-within:opacity-100"
                          onClick={() => onDismiss(event.id)}
                        >
                          <X className="size-3" />
                        </button>
                        <span className="block truncate text-[11px] font-semibold">
                          {event.starts_at ? format(new Date(event.starts_at), "h:mm a") : "All day"}
                        </span>
                        <span className="block truncate pr-4 text-xs" title={event.title}>
                          {event.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-white/16 bg-black/10 px-2 py-6 text-center text-xs text-[var(--today-muted)]">
                      Open
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
