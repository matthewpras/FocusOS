"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Task } from "@/types"
import { cn } from "@/lib/utils"
import { getTodayTaskPreview } from "@/lib/today-home"

type TodayTaskListProps = {
  tasks: Task[]
  onComplete: (task: Task) => void
}

function taskMeta(task: Task) {
  const pieces = []
  if (task.category) pieces.push(task.category)
  if (task.priority === "high") pieces.push("High priority")
  if (task.assistant_source) pieces.push(task.assistant_source)
  return pieces.join(" · ") || "Next action"
}

function dueLabel(task: Task) {
  if (!task.due_date) return "Unscheduled"
  const today = new Date().toISOString().slice(0, 10)
  if (task.due_date < today) return "Overdue"
  if (task.due_date === today) return "Today"
  return task.due_date
}

export function TodayTaskList({ tasks, onComplete }: TodayTaskListProps) {
  const { visibleTasks, hiddenTaskCount } = getTodayTaskPreview(tasks)

  return (
    <section
      aria-labelledby="today-tasks-heading"
      className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--today-line)] px-4 py-3">
        <div>
          <h2 id="today-tasks-heading" className="text-sm font-semibold">
            Tasks
          </h2>
          <p className="text-xs text-[var(--today-muted)]">
            Highest-signal actions for today
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-[var(--today-panel-muted)] px-2 py-1 text-xs font-medium tabular-nums text-[var(--today-muted)]">
          {visibleTasks.length}/{tasks.length}
        </span>
      </div>

      {tasks.length ? (
        <>
          <ul className="divide-y divide-[var(--today-line)]">
            {visibleTasks.map((task) => (
              <li key={task.id} className="flex min-w-0 items-start gap-3 px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Complete ${task.text}`}
                  onClick={() => onComplete(task)}
                  className="mt-0.5 size-7 rounded-full border border-[var(--today-line)] text-transparent hover:border-[var(--today-blue)] hover:bg-[oklch(0.24_0.07_255)] hover:text-[oklch(0.86_0.07_245)] focus-visible:ring-[var(--today-blue)]"
                >
                  <Check className="size-3.5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.text}</p>
                  <p className="mt-1 truncate text-xs capitalize text-[var(--today-muted)]">
                    {taskMeta(task)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                    dueLabel(task) === "Overdue"
                      ? "border border-red-300/20 bg-red-400/10 text-red-200"
                      : "border border-white/10 bg-[var(--today-panel-muted)] text-[var(--today-muted)]",
                  )}
                >
                  {dueLabel(task)}
                </span>
              </li>
            ))}
          </ul>
          {hiddenTaskCount > 0 ? (
            <div className="border-t border-[var(--today-line)] px-4 py-3 text-xs font-medium text-[var(--today-muted)]">
              {hiddenTaskCount} more not shown
            </div>
          ) : null}
        </>
      ) : (
        <div className="px-4 py-10 text-sm text-[var(--today-muted)]">
          No tasks need attention yet. Capture one next action to protect the day.
        </div>
      )}
    </section>
  )
}
