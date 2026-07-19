"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { addDays, format } from "date-fns"
import { AppShell } from "@/components/app-shell"
import { TodayHomeView } from "@/components/today-home/today-home-view"
import { useAssistant } from "@/hooks/useAssistant"
import { useAuth } from "@/hooks/use-auth"
import { useCaptures } from "@/hooks/useCaptures"
import { useExternalCommitments } from "@/hooks/useExternalCommitments"
import { useTasks } from "@/hooks/useTasks"
import {
  buildCompactCalendarDays,
  calculateFocusPressureScore,
  getAssistantFreshness,
  getScheduleRows,
  getTodayTasks,
} from "@/lib/today-home"
import type { Task } from "@/types"

export default function Home() {
  const { user, session } = useAuth()
  const tasks = useTasks(user?.id)
  const captures = useCaptures(user?.id)
  const assistant = useAssistant(user?.id, session?.access_token)
  const commitments = useExternalCommitments(user?.id)
  const router = useRouter()
  const now = useMemo(() => new Date(), [])

  const todayTasks = useMemo(
    () => getTodayTasks(tasks.tasks, now),
    [tasks.tasks, now],
  )
  const calendarDays = useMemo(
    () => buildCompactCalendarDays(commitments.upcomingEvents, now),
    [commitments.upcomingEvents, now],
  )
  const scheduleRows = useMemo(
    () => getScheduleRows(commitments.upcomingEvents),
    [commitments.upcomingEvents],
  )
  const pressure = useMemo(
    () =>
      calculateFocusPressureScore({
        overdueTaskCount: tasks.stats.overdue.length,
        todayTaskCount: todayTasks.length,
        eventCount: scheduleRows.length,
        inboxCount: captures.captures.length + commitments.inboxSignals.length,
      }),
    [
      captures.captures.length,
      commitments.inboxSignals.length,
      scheduleRows.length,
      tasks.stats.overdue.length,
      todayTasks.length,
    ],
  )
  const assistantFreshness = useMemo(
    () => getAssistantFreshness(assistant.sourceState, now),
    [assistant.sourceState, now],
  )

  function openQuickCapture() {
    window.dispatchEvent(new CustomEvent("focusos:open-capture"))
  }

  function completeTask(task: Task) {
    void tasks.updateTask(task.id, { completed: true })
  }

  function snoozeTask(task: Task) {
    void tasks.updateTask(task.id, { due_date: format(addDays(now, 1), "yyyy-MM-dd") })
  }

  function runHermes() {
    void assistant.runNow()
  }

  function openInbox() {
    router.push("/capture")
  }

  return (
    <AppShell chrome="today">
      <TodayHomeView
        inboxCount={captures.captures.length}
        days={calendarDays}
        tasks={todayTasks}
        pressure={pressure}
        assistantFreshness={assistantFreshness}
        scheduleRows={scheduleRows}
        assistantRunning={assistant.running}
        onCompleteTask={completeTask}
        onSnoozeTask={snoozeTask}
        onQuickCapture={openQuickCapture}
        onRunHermes={runHermes}
        onOpenInbox={openInbox}
      />
    </AppShell>
  )
}
