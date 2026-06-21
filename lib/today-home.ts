import { addDays, format, isSameDay, parseISO } from "date-fns"

type TaskLike = {
  id: string
  text?: string
  title?: string
  completed?: boolean | null
  due_date?: string | null
  priority?: string | null
}

type CommitmentLike = {
  id: string
  title: string
  starts_at?: string | null
  due_date?: string | null
  source?: string | null
}

export type CompactCalendarEvent = {
  id: string
  title: string
  timeLabel: string
  tone: "blue" | "violet" | "green" | "amber"
}

export type CompactCalendarDay = {
  date: Date
  label: string
  dayNumber: string
  events: CompactCalendarEvent[]
}

export type ScheduleRow = {
  id: string
  title: string
  timeLabel: string
  note: string
}

export type FocusPressure = {
  score: number
  label: "Low Focus Pressure" | "Moderate Focus Pressure" | "High Focus Needed"
  availableFocusMinutes: number
}

function dateKey(value: Date) {
  return format(value, "yyyy-MM-dd")
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = value.includes("T") ? parseISO(value) : parseISO(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function eventTone(index: number): CompactCalendarEvent["tone"] {
  return (["blue", "violet", "green", "amber"] as const)[index % 4]
}

export function getTodayTasks<T extends TaskLike>(tasks: T[], now = new Date()): T[] {
  const today = dateKey(now)

  return tasks
    .filter((task) => !task.completed)
    .filter((task) => !task.due_date || task.due_date <= today)
    .sort((a, b) => {
      const aDue = a.due_date ?? "9999-12-31"
      const bDue = b.due_date ?? "9999-12-31"
      if (aDue !== bDue) return aDue.localeCompare(bDue)
      return String(a.text ?? a.title ?? "").localeCompare(String(b.text ?? b.title ?? ""))
    })
}

export function buildCompactCalendarDays(
  commitments: CommitmentLike[],
  now = new Date(),
): CompactCalendarDay[] {
  return Array.from({ length: 5 }, (_, dayIndex) => {
    const date = addDays(now, dayIndex)
    const events = commitments
      .filter((item) => item.source === "google_calendar" && Boolean(item.starts_at))
      .filter((item) => {
        const startsAt = parseDate(item.starts_at)
        return startsAt ? isSameDay(startsAt, date) : false
      })
      .slice(0, 3)
      .map((item, eventIndex) => ({
        id: item.id,
        title: item.title,
        timeLabel: format(parseDate(item.starts_at) ?? date, "h:mm a"),
        tone: eventTone(dayIndex + eventIndex),
      }))

    return {
      date,
      label: format(date, "EEE"),
      dayNumber: format(date, "d"),
      events,
    }
  })
}

export function getScheduleRows(commitments: CommitmentLike[]): ScheduleRow[] {
  return commitments
    .filter((item) => item.source === "google_calendar" && Boolean(item.starts_at))
    .map((item) => ({
      item,
      startsAt: parseDate(item.starts_at),
    }))
    .filter((entry): entry is { item: CommitmentLike; startsAt: Date } => Boolean(entry.startsAt))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 5)
    .map(({ item, startsAt }) => ({
      id: item.id,
      title: item.title,
      timeLabel: format(startsAt, "h:mm a"),
      note: "Calendar commitment",
    }))
}

export function calculateFocusPressureScore(input: {
  overdueTaskCount: number
  todayTaskCount: number
  eventCount: number
  inboxCount: number
}): FocusPressure {
  const score = Math.min(
    100,
    20 +
      input.overdueTaskCount * 16 +
      input.todayTaskCount * 5 +
      input.eventCount * 7 +
      input.inboxCount * 4,
  )
  const availableFocusMinutes = Math.max(30, 260 - score * 2)
  const label =
    score >= 60
      ? "High Focus Needed"
      : score >= 40
        ? "Moderate Focus Pressure"
        : "Low Focus Pressure"

  return { score, label, availableFocusMinutes }
}

export function formatFocusMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (!hours) return `${remaining}m`
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}
