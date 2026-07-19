"use client"

import { useMemo } from "react"
import { Command, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/command-palette"
import { CompactWeekCalendar } from "@/components/today-home/compact-week-calendar"
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
  onSnoozeTask: (task: Task) => void
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
  onSnoozeTask,
  onQuickCapture,
  onRunHermes,
  onOpenInbox,
}: TodayHomeViewProps) {
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
    <>
      <div className="mx-auto flex max-w-[86rem] flex-col gap-4 px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:px-5 lg:px-6 lg:pb-4">
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
            <TodayTaskList tasks={tasks} onComplete={onCompleteTask} onSnooze={onSnoozeTask} />
          </div>
          <div className="mt-20 xl:mt-0">
            <ScheduleRail pressure={pressure} scheduleRows={scheduleRows} />
          </div>
        </div>
      </div>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-3 z-40 lg:bottom-5 lg:right-5">
        <Button
          type="button"
          className="h-11 gap-2 rounded-lg border border-white/12 bg-[oklch(0.075_0.014_252)] px-3 text-white shadow-[0_12px_28px_rgb(0_0_0/0.32)] hover:bg-[oklch(0.14_0.018_252)]"
          onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
        >
          <Command className="size-4" />
          <span className="hidden sm:inline">Quick actions</span>
          <span className="sm:hidden">Actions</span>
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
    </>
  )
}
