"use client"

import { useMemo, useState } from "react"
import { Command, Inbox, Loader2, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompactWeekCalendar } from "@/components/today-home/compact-week-calendar"
import { CommandPaletteShell } from "@/components/today-home/command-palette-shell"
import { DarkTodaySidebar } from "@/components/today-home/dark-today-sidebar"
import { ScheduleRail } from "@/components/today-home/schedule-rail"
import { TodayTaskList } from "@/components/today-home/today-task-list"
import type {
  CompactCalendarDay,
  FocusPressure,
  ScheduleRow,
} from "@/lib/today-home"
import { formatFocusMinutes } from "@/lib/today-home"
import type { Task } from "@/types"

type TodayHomeViewProps = {
  inboxCount: number
  days: CompactCalendarDay[]
  tasks: Task[]
  pressure: FocusPressure
  scheduleRows: ScheduleRow[]
  assistantRunning: boolean
  onCompleteTask: (task: Task) => void
  onQuickCapture: () => void
  onRunHermes: () => void
  onOpenInbox: () => void
}

export function TodayHomeView({
  inboxCount,
  days,
  tasks,
  pressure,
  scheduleRows,
  assistantRunning,
  onCompleteTask,
  onQuickCapture,
  onRunHermes,
  onOpenInbox,
}: TodayHomeViewProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  )

  return (
    <div className="min-h-screen bg-[var(--today-bg)] text-[var(--today-ink)]">
      <div className="flex min-h-screen">
        <DarkTodaySidebar inboxCount={inboxCount} />
        <main className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-0">
          <div className="mx-auto flex max-w-[86rem] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
            <header className="flex flex-col gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--today-muted)]">
                  {dateLabel}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                  Today
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[oklch(0.95_0.018_250)] px-3 py-1.5 text-xs font-semibold text-[var(--today-muted)]">
                  {pressure.score}/100 · {formatFocusMinutes(pressure.availableFocusMinutes)} available
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[var(--today-line)] bg-white text-[var(--today-ink)] hover:bg-[oklch(0.97_0.01_244)]"
                  onClick={onOpenInbox}
                >
                  <Inbox className="size-4" />
                  Inbox
                </Button>
                <Button
                  type="button"
                  className="bg-[var(--today-blue)] text-white hover:bg-[oklch(0.51_0.2_260)]"
                  onClick={onRunHermes}
                  disabled={assistantRunning}
                >
                  {assistantRunning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Run Hermes
                </Button>
              </div>
            </header>

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
              <div className="min-w-0 space-y-4">
                <CompactWeekCalendar days={days} />
                <TodayTaskList tasks={tasks} onComplete={onCompleteTask} />
              </div>
              <div className="mt-20 xl:mt-0">
                <ScheduleRail pressure={pressure} scheduleRows={scheduleRows} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-3 z-40 lg:bottom-5 lg:right-5">
        <Button
          type="button"
          className="h-11 gap-2 rounded-lg bg-[var(--today-sidebar)] px-3 text-white hover:bg-[oklch(0.23_0.018_255)]"
          onClick={() => setCommandOpen(true)}
        >
          <Command className="size-4" />
          <span className="hidden sm:inline">Type a command or search</span>
          <span className="sm:hidden">Command</span>
        </Button>
      </div>
      <Button
        type="button"
        aria-label="Quick capture"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-3 z-40 size-11 bg-[var(--today-blue)] text-white hover:bg-[oklch(0.51_0.2_260)] lg:hidden"
        onClick={onQuickCapture}
      >
        <Plus className="size-5" />
      </Button>

      <CommandPaletteShell
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onQuickCapture={onQuickCapture}
        onRunHermes={onRunHermes}
        onOpenInbox={onOpenInbox}
      />
    </div>
  )
}
