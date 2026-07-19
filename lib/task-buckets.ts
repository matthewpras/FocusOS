import { format } from "date-fns"
import type { Task } from "@/types"

/**
 * GTD-style task buckets, derived from existing task fields (no schema changes):
 * - Upcoming: open, has a due date in the future.
 * - Anytime:  open, no due date, not marked low priority. "Do whenever, but real."
 * - Someday:  open, no due date, marked low priority. Backlog / maybe-later.
 * - Logbook:  completed tasks, most recent first.
 */

export function getUpcomingTasks(tasks: Task[], today = new Date()) {
  const todayStr = format(today, "yyyy-MM-dd")
  return tasks
    .filter((task) => !task.completed && task.due_date && task.due_date > todayStr)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
}

export function getAnytimeTasks(tasks: Task[]) {
  return tasks.filter(
    (task) => !task.completed && !task.due_date && task.priority !== "low",
  )
}

export function getSomedayTasks(tasks: Task[]) {
  return tasks.filter(
    (task) => !task.completed && !task.due_date && task.priority === "low",
  )
}

export function getLogbookTasks(tasks: Task[]) {
  return [...tasks]
    .filter((task) => task.completed)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}
