import {
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  subDays,
} from "date-fns"
import type { HabitLog } from "@/types"

function toDateSet(logs: HabitLog[]) {
  return new Set(logs.map((log) => log.logged_date))
}

export function computeCurrentStreak(logs: HabitLog[], today = new Date()) {
  const dates = toDateSet(logs)
  let streak = 0
  let cursor = today

  while (dates.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }

  return streak
}

export function computeLongestStreak(logs: HabitLog[]) {
  const days = [...toDateSet(logs)].sort()
  let best = 0
  let current = 0
  let previous: Date | null = null

  for (const day of days) {
    const date = parseISO(day)
    current =
      previous && isSameDay(date, subDays(previous, -1)) ? current + 1 : 1
    best = Math.max(best, current)
    previous = date
  }

  return best
}

export function buildHeatmap(logs: HabitLog[], days = 30, today = new Date()) {
  const dates = toDateSet(logs)
  const start = subDays(today, days - 1)

  return eachDayOfInterval({ start, end: today }).map((date) => ({
    date: format(date, "yyyy-MM-dd"),
    label: format(date, "MMM d"),
    completed: dates.has(format(date, "yyyy-MM-dd")),
  }))
}
