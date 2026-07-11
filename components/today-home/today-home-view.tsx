"use client"

import { useMemo, useState } from "react"
import { Command, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CompactWeekCalendar } from "@/components/today-home/compact-week-calendar"
import { CommandPaletteShell } from "@/components/today-home/command-palette-shell"
import { DarkTodaySidebar } from "@/components/today-home/dark-today-sidebar"
import { ScheduleRail } from "@/components/today-home/schedule-rail"
import { TodayHero } from "@/components/today-home/today-hero"
import { TodayTaskList } from "@/components/today-home/today-task-list"
import type {
  AssistantFreshness,
  CompactCalendarDay,
  FocusPressure,
  ScheduleRow,
} from "@/lib/today-home"
import type { Task } from "@/types"

type TodayHomeViewProps = {
  inboxCount: number
  days: CompactCalendarDay[]
  tasks: Task[]
  pressure: FocusPressure
  assistantFreshness: AssistantFreshness
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
  assistantFreshness,
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
    <div className="min-h-screen bg-[var(--today-bg)] bg-[radial-gradient(circle_at_78%_0%,oklch(0.24_0.055_260)_0,transparent_30rem),linear-gradient(180deg,oklch(0.13_0.019_252),var(--today-bg)_22rem)] text-[var(--today-ink)]">
      <div className="flex min-h-screen">
        <DarkTodaySidebar inboxCount={inboxCount} />
        <main className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-0">
          <div className="mx-auto flex max-w-[86rem] flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
            <TodayHero
              dateLabel={dateLabel}
              inboxCount={inboxCount}
              taskCount={tasks.length}
              pressure={pressure}
              assistantFreshness={assistantFreshness}
              assistantRunning={assistantRunning}
              onOpenInbox={onOpenInbox}
              onRunHermes={onRunHermes}
            />

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
          className="h-11 gap-2 rounded-lg border border-white/12 bg-[oklch(0.075_0.014_252)] px-3 text-white shadow-[0_12px_28px_rgb(0_0_0/0.32)] hover:bg-[oklch(0.14_0.018_252)]"
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
