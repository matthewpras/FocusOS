import { google } from "googleapis"
import type {
  AssistantBrief,
  AssistantRunStatus,
  AssistantSourceState,
  AssistantTriggerSource,
  Capture,
  Habit,
  Task,
} from "@/types"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"
import { ASSISTANT_MODEL, synthesizeAssistantBrief } from "@/lib/openrouter"

type SourceState = "connected" | "skipped" | "failed"

type SourceReport = {
  state: SourceState
  syncedAt: string | null
  note: string
  count: number
}

type Commitment = {
  source: "google_calendar" | "gmail"
  sourceId: string
  title: string
  details: string | null
  startsAt: string | null
  dueDate: string | null
  confidence: number
  actionHint: string | null
  actionable: boolean
  captureOnly: boolean
  payload: Record<string, unknown>
}

type AssistantResult = {
  status: AssistantRunStatus
  summary: string
  topPriorities: string[]
  firstFocusBlock: string | null
  focusNote: string | null
  risks: string[]
  nextActions: string[]
  changes: string[]
  errors: string[]
  sources: Record<string, SourceReport>
}

const ACTIVE_HOURS = new Set([6, 10, 14, 18, 22])

function getTimeZone() {
  return process.env.GOOGLE_TIMEZONE || "America/New_York"
}

function toDateParts(date: Date, timeZone = getTimeZone()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00"

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  }
}

function formatDateKey(date: Date, timeZone = getTimeZone()) {
  const parts = toDateParts(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function startOfWindowIso(date: Date) {
  return new Date(date.getTime() - 6 * 60 * 60 * 1000).toISOString()
}

function endOfWindowIso(date: Date) {
  return new Date(date.getTime() + 54 * 60 * 60 * 1000).toISOString()
}

function formatReadableTime(iso: string | null) {
  if (!iso) return null
  const date = new Date(iso)

  return new Intl.DateTimeFormat("en-US", {
    timeZone: getTimeZone(),
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function getLocalHour(date: Date, timeZone = getTimeZone()) {
  return toDateParts(date, timeZone).hour
}

function computeNextSuggestedRun(now: Date) {
  const probe = new Date(now)

  for (let step = 1; step <= 24; step += 1) {
    probe.setHours(probe.getHours() + 1, 0, 0, 0)
    if (ACTIVE_HOURS.has(getLocalHour(probe))) {
      return probe.toISOString()
    }
  }

  return null
}

function normalizeText(text: string) {
  return text.trim().replace(/\s+/g, " ")
}

function rankPriority(task: Task) {
  if (task.priority === "high") return 3
  if (task.priority === "medium") return 2
  return 1
}

function needsEventTask(title: string, details: string | null) {
  const combined = `${title} ${details ?? ""}`.toLowerCase()
  return /(deadline|deliver|submit|send|review|follow up|follow-up|prep|prepare|invoice|renew)/.test(
    combined,
  )
}

function feelsActionable(text: string) {
  return /(reply|respond|follow up|follow-up|send|review|deadline|confirm|pay|ship|schedule|book|submit)/i.test(
    text,
  )
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function topTaskLines(tasks: Task[], today: string) {
  return tasks
    .filter((task) => !task.completed)
    .sort((left, right) => {
      const leftBucket =
        left.due_date && left.due_date < today
          ? 0
          : left.due_date === today
            ? 1
            : 2
      const rightBucket =
        right.due_date && right.due_date < today
          ? 0
          : right.due_date === today
            ? 1
            : 2

      if (leftBucket !== rightBucket) return leftBucket - rightBucket
      return rankPriority(right) - rankPriority(left)
    })
    .slice(0, 5)
    .map((task) => task.text)
}

function computeFocusBlock(events: Commitment[], now: Date) {
  const today = formatDateKey(now)
  const todaysEvents = events
    .filter((item) => item.source === "google_calendar" && item.startsAt)
    .filter((item) => formatDateKey(new Date(item.startsAt!)) === today)
    .map((item) => new Date(item.startsAt!))
    .sort((left, right) => left.getTime() - right.getTime())

  if (!todaysEvents.length) {
    return {
      firstFocusBlock: "8:00 AM-10:00 AM",
      focusNote: "Calendar open. Protect first two deep-work hours.",
    }
  }

  const startProbe = new Date(now)
  startProbe.setMinutes(0, 0, 0)

  for (const eventStart of todaysEvents) {
    const gapMinutes = Math.floor((eventStart.getTime() - startProbe.getTime()) / 60000)
    if (gapMinutes >= 75) {
      const end = new Date(startProbe.getTime() + Math.min(gapMinutes, 120) * 60000)
      return {
        firstFocusBlock: `${formatReadableTime(startProbe.toISOString())}-${formatReadableTime(
          end.toISOString(),
        )}`,
        focusNote: "First open block large enough for deep work.",
      }
    }

    startProbe.setTime(eventStart.getTime() + 60 * 60000)
  }

  return {
    firstFocusBlock: null,
    focusNote: "Calendar crowded. Treat next open hour as admin buffer.",
  }
}

function compareBriefs(
  current:
    | Pick<
        AssistantBrief,
        "summary" | "top_priorities" | "first_focus_block" | "risks" | "next_actions"
      >
    | null
    | undefined,
  next: {
    summary: string
    topPriorities: string[]
    firstFocusBlock: string | null
    risks: string[]
    nextActions: string[]
  },
) {
  if (!current) return false

  return (
    current.summary === next.summary &&
    JSON.stringify(current.top_priorities) === JSON.stringify(next.topPriorities) &&
    current.first_focus_block === next.firstFocusBlock &&
    JSON.stringify(current.risks) === JSON.stringify(next.risks) &&
    JSON.stringify(current.next_actions) === JSON.stringify(next.nextActions)
  )
}

function getGoogleAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) return null

  const auth = new google.auth.OAuth2(clientId, clientSecret)
  auth.setCredentials({ refresh_token: refreshToken })
  return auth
}

async function fetchCalendarCommitments(now: Date) {
  const auth = getGoogleAuthClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID

  if (!auth || !calendarId) {
    return {
      commitments: [] as Commitment[],
      report: {
        state: "skipped" as const,
        syncedAt: null,
        note: "Calendar not configured.",
        count: 0,
      },
    }
  }

  try {
    const calendar = google.calendar({ version: "v3", auth })
    const { data } = await calendar.events.list({
      calendarId,
      singleEvents: true,
      orderBy: "startTime",
      timeMin: startOfWindowIso(now),
      timeMax: endOfWindowIso(now),
      maxResults: 25,
      timeZone: getTimeZone(),
    })

    const commitments: Commitment[] = (data.items ?? [])
      .filter((item) => item.id && item.summary)
      .map((item) => {
        const details = normalizeText(item.description ?? "")
        return {
          source: "google_calendar",
          sourceId: item.id!,
          title: normalizeText(item.summary!),
          details: details || null,
          startsAt: item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T09:00:00` : null),
          dueDate: item.start?.date ?? null,
          confidence: 0.96,
          actionHint: needsEventTask(item.summary!, details) ? "Create prep task" : "Block focus around this",
          actionable: needsEventTask(item.summary!, details),
          captureOnly: false,
          payload: {
            htmlLink: item.htmlLink ?? null,
            status: item.status ?? null,
          },
        }
      })

    return {
      commitments,
      report: {
        state: "connected" as const,
        syncedAt: new Date().toISOString(),
        note: `${commitments.length} events checked.`,
        count: commitments.length,
      },
    }
  } catch (error) {
    return {
      commitments: [] as Commitment[],
      report: {
        state: "failed" as const,
        syncedAt: null,
        note: error instanceof Error ? error.message : "Calendar fetch failed.",
        count: 0,
      },
    }
  }
}

async function fetchGmailCommitments() {
  const auth = getGoogleAuthClient()

  if (!auth) {
    return {
      commitments: [] as Commitment[],
      report: {
        state: "skipped" as const,
        syncedAt: null,
        note: "Gmail not configured.",
        count: 0,
      },
    }
  }

  try {
    const gmail = google.gmail({ version: "v1", auth })
    const query =
      process.env.GOOGLE_GMAIL_QUERY ??
      "newer_than:2d (is:important OR label:starred OR category:primary)"

    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 10,
    })

    const messages = await Promise.all(
      (data.messages ?? []).map(async (message) => {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: message.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        })
        return detail.data
      }),
    )

    const commitments: Commitment[] = messages
      .filter((message) => message.id)
      .map((message) => {
        const headers = Object.fromEntries(
          (message.payload?.headers ?? []).map((header) => [header.name ?? "", header.value ?? ""]),
        )
        const subject = normalizeText(headers.Subject || message.snippet || "Email follow-up")
        const details = normalizeText(`${headers.From || ""} ${message.snippet || ""}`)
        const actionable = feelsActionable(`${subject} ${details}`)
        return {
          source: "gmail",
          sourceId: message.id!,
          title: subject,
          details: details || null,
          startsAt: null,
          dueDate: null,
          confidence: actionable ? 0.78 : 0.52,
          actionHint: actionable ? "Create follow-up task" : "Review in inbox",
          actionable,
          captureOnly: !actionable,
          payload: {
            threadId: message.threadId ?? null,
            internalDate: message.internalDate ?? null,
          },
        }
      })

    return {
      commitments,
      report: {
        state: "connected" as const,
        syncedAt: new Date().toISOString(),
        note: `${commitments.length} priority emails checked.`,
        count: commitments.length,
      },
    }
  } catch (error) {
    return {
      commitments: [] as Commitment[],
      report: {
        state: "failed" as const,
        syncedAt: null,
        note: error instanceof Error ? error.message : "Gmail fetch failed.",
        count: 0,
      },
    }
  }
}

async function upsertExternalCommitments(userId: string, commitments: Commitment[]) {
  const supabase = getSupabaseServerAdmin()
  if (!supabase || !commitments.length) return

  await supabase.from("external_commitments").upsert(
    commitments.map((item) => ({
      user_id: userId,
      source: item.source,
      source_id: item.sourceId,
      title: item.title,
      details: item.details,
      starts_at: item.startsAt,
      due_date: item.dueDate,
      confidence: item.confidence,
      action_hint: item.actionHint,
      payload: item.payload,
    })),
    { onConflict: "user_id,source,source_id" },
  )
}

async function ensureTask(
  userId: string,
  task: {
    text: string
    priority: "low" | "medium" | "high"
    dueDate: string | null
    category: "work" | "personal" | "health" | "other"
    assistantKey: string
    assistantSource: string
  },
) {
  const supabase = getSupabaseServerAdmin()
  if (!supabase) return false

  const existing = await supabase
    .from("tasks")
    .select("id,text,priority,due_date")
    .eq("user_id", userId)
    .eq("assistant_key", task.assistantKey)
    .maybeSingle()

  if (existing.data) {
    if (
      existing.data.text === task.text &&
      existing.data.priority === task.priority &&
      existing.data.due_date === task.dueDate
    ) {
      return false
    }

    await supabase
      .from("tasks")
      .update({
        text: task.text,
        priority: task.priority,
        due_date: task.dueDate,
        assistant_source: task.assistantSource,
        created_by_assistant: true,
      })
      .eq("id", existing.data.id)

    return true
  }

  await supabase.from("tasks").insert({
    user_id: userId,
    text: task.text,
    priority: task.priority,
    due_date: task.dueDate,
    category: task.category,
    assistant_key: task.assistantKey,
    assistant_source: task.assistantSource,
    created_by_assistant: true,
  })

  return true
}

async function ensureHabit(
  userId: string,
  habit: {
    name: string
    icon: string
    color: string
    assistantKey: string
    assistantSource: string
  },
) {
  const supabase = getSupabaseServerAdmin()
  if (!supabase) return false

  const existing = await supabase
    .from("habits")
    .select("id,name,archived")
    .eq("user_id", userId)
    .eq("assistant_key", habit.assistantKey)
    .maybeSingle()

  if (existing.data) {
    if (existing.data.name === habit.name && existing.data.archived === false) return false
    await supabase
      .from("habits")
      .update({
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        archived: false,
        assistant_source: habit.assistantSource,
        created_by_assistant: true,
      })
      .eq("id", existing.data.id)
    return true
  }

  await supabase.from("habits").insert({
    user_id: userId,
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    assistant_key: habit.assistantKey,
    assistant_source: habit.assistantSource,
    created_by_assistant: true,
  })

  return true
}

export async function shouldRunForSchedule(now = new Date()) {
  return ACTIVE_HOURS.has(getLocalHour(now))
}

export async function runAssistant(userId: string, triggerSource: AssistantTriggerSource) {
  const supabase = getSupabaseServerAdmin()
  if (!supabase) {
    throw new Error("Supabase service role env missing.")
  }

  const startedAt = new Date()
  const today = formatDateKey(startedAt)
  const [
    { data: tasksData },
    { data: habitsData },
    { data: capturesData },
    latestBriefResult,
    sourceStateResult,
  ] =
    await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("habits").select("*").eq("user_id", userId).eq("archived", false).order("created_at", { ascending: false }),
      supabase.from("captures").select("*").eq("user_id", userId).eq("converted", false).order("created_at", { ascending: false }),
      supabase.from("assistant_briefs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("assistant_source_states").select("*").eq("user_id", userId).maybeSingle(),
    ])

  const tasks = (tasksData ?? []) as Task[]
  const habits = (habitsData ?? []) as Habit[]
  const captures = (capturesData ?? []) as Capture[]
  const latestBrief = latestBriefResult.data as AssistantBrief | null
  const previousSourceState = sourceStateResult.data as AssistantSourceState | null

  const [calendarResult, gmailResult] = await Promise.all([
    fetchCalendarCommitments(startedAt),
    fetchGmailCommitments(),
  ])

  const commitments = [...calendarResult.commitments, ...gmailResult.commitments]
  await upsertExternalCommitments(userId, commitments)

  const changes: string[] = []
  const errors = [calendarResult.report, gmailResult.report]
    .filter((source) => source.state === "failed")
    .map((source) => source.note)

  for (const commitment of commitments) {
    // Non-actionable commitments (e.g. low-priority gmail messages) already live in
    // external_commitments via upsertExternalCommitments() above, surfaced on the Calendar
    // page's "Inbox follow-ups" panel. Captures are Matthew's own typed-in thoughts for
    // Hermes's end-of-day summary, not a second copy of synced email/calendar noise.
    if (commitment.captureOnly) continue

    if (commitment.actionable) {
      const changed = await ensureTask(userId, {
        text:
          commitment.source === "gmail"
            ? `Email follow-up: ${commitment.title}`
            : `Prepare: ${commitment.title}`,
        priority: commitment.source === "gmail" ? "high" : "medium",
        dueDate: commitment.dueDate ?? today,
        category: "work",
        assistantKey: `${commitment.source}:${commitment.sourceId}:task`,
        assistantSource: commitment.source,
      })
      if (changed) changes.push(`Task updated from ${commitment.source}: ${commitment.title}`)
    }
  }

  const overdueTasks = tasks.filter((task) => !task.completed && task.due_date && task.due_date < today)
  const hasMorningHabit = habits.some((habit) =>
    normalizeText(habit.name).toLowerCase().includes("morning plan"),
  )

  if (!hasMorningHabit) {
    const changed = await ensureHabit(userId, {
      name: "Morning plan reset",
      icon: "◎",
      color: "#60A5FA",
      assistantKey: "assistant:habit:morning-plan",
      assistantSource: "assistant",
    })
    if (changed) changes.push("Added morning planning habit.")
  }

  if (captures.length > 0) {
    const changed = await ensureHabit(userId, {
      name: "Inbox zero sweep",
      icon: "✦",
      color: "#A78BFA",
      assistantKey: "assistant:habit:inbox-sweep",
      assistantSource: "assistant",
    })
    if (changed) changes.push("Added inbox review habit.")
  }

  if (overdueTasks.length > 0) {
    const changed = await ensureHabit(userId, {
      name: "Clear one overdue task",
      icon: "→",
      color: "#F59E0B",
      assistantKey: "assistant:habit:clear-overdue",
      assistantSource: "assistant",
    })
    if (changed) changes.push("Added overdue reset habit.")
  }

  const taskPriorityLines = topTaskLines(
    [...tasks].sort((left, right) => rankPriority(right) - rankPriority(left)),
    today,
  )
  const commitmentPriorityLines = commitments
    .filter(
      (item) =>
        (item.startsAt && formatDateKey(new Date(item.startsAt)) === today) || item.dueDate === today,
    )
    .slice(0, 3)
    .map((item) => item.title)

  const topPriorities = dedupeStrings([...taskPriorityLines, ...commitmentPriorityLines]).slice(0, 3)
  const focus = computeFocusBlock(calendarResult.commitments, startedAt)

  const meetingCountToday = calendarResult.commitments.filter((item) => item.startsAt?.startsWith(today)).length
  const risks = dedupeStrings([
    meetingCountToday >= 5 ? "Heavy meeting day. Guard context switches." : "",
    !focus.firstFocusBlock ? "No deep-work block found yet." : "",
    overdueTasks.length ? `${overdueTasks.length} overdue tasks need attention.` : "",
    captures.length >= 5 ? "Inbox filling up. Triage before noon." : "",
    ...errors.map((error) => `Source issue: ${error}`),
  ])

  const nextActions = dedupeStrings([
    topPriorities[0] ? `Start with ${topPriorities[0]}` : "",
    focus.firstFocusBlock ? `Protect ${focus.firstFocusBlock}` : "Use next open hour for admin cleanup.",
    captures.length ? "Review assistant-added inbox items." : "",
  ]).slice(0, 4)

  const summary = errors.length
    ? `Assistant hit source sync errors. ${topPriorities.length} priorities, ${meetingCountToday} calendar commitments, ${captures.length} inbox items in play.`
    : topPriorities.length
      ? `Assistant ready. ${topPriorities.length} priorities, ${meetingCountToday} calendar commitments, ${captures.length} inbox items in play.`
      : `Assistant checked sources. ${meetingCountToday} calendar commitments and no urgent task reshuffle.`

  const llmBrief = await synthesizeAssistantBrief({
    today,
    tasks: tasks
      .filter((task) => !task.completed)
      .map((task) => ({
        text: task.text,
        priority: task.priority,
        due_date: task.due_date,
        completed: task.completed,
      })),
    captures: captures.map((capture) => ({ text: capture.text })),
    commitments: commitments.map((item) => ({
      title: item.title,
      startsAt: item.startsAt,
      dueDate: item.dueDate,
      source: item.source,
    })),
    overdueCount: overdueTasks.length,
    meetingCountToday,
    firstFocusBlock: focus.firstFocusBlock,
    sourceErrors: errors,
    fallback: { summary, topPriorities, risks, nextActions },
  })

  const finalSummary = llmBrief?.summary ?? summary
  const finalTopPriorities = llmBrief?.topPriorities ?? topPriorities
  const finalRisks = llmBrief?.risks ?? risks
  const finalNextActions = llmBrief?.nextActions ?? nextActions

  const noMeaningfulChange =
    changes.length === 0 &&
    compareBriefs(latestBrief, {
      summary: finalSummary,
      topPriorities: finalTopPriorities,
      firstFocusBlock: focus.firstFocusBlock,
      risks: finalRisks,
      nextActions: finalNextActions,
    })

  const status: AssistantRunStatus =
    errors.length > 0
      ? changes.length > 0
        ? "partial_failure"
        : "failed"
      : noMeaningfulChange
        ? "no_change"
        : "success"

  const { data: runData, error: runError } = await supabase
    .from("assistant_runs")
    .insert({
      user_id: userId,
      status,
      trigger_source: triggerSource,
      summary: finalSummary,
      changes,
      errors,
      sources: {
        calendar: calendarResult.report,
        gmail: gmailResult.report,
      },
      started_at: startedAt.toISOString(),
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (runError) {
    throw runError
  }

  if (!noMeaningfulChange || !latestBrief) {
    await supabase.from("assistant_briefs").insert({
      user_id: userId,
      run_id: runData.id,
      summary: finalSummary,
      top_priorities: finalTopPriorities,
      first_focus_block: focus.firstFocusBlock,
      risks: finalRisks,
      next_actions: finalNextActions,
      focus_note: focus.focusNote,
      changed: changes.length > 0,
    })
  }

  await supabase.from("assistant_source_states").upsert({
    user_id: userId,
    calendar_last_synced_at: calendarResult.report.syncedAt,
    gmail_last_synced_at: gmailResult.report.syncedAt,
    last_successful_run_at:
      status === "success" || status === "no_change"
        ? new Date().toISOString()
        : previousSourceState?.last_successful_run_at ?? null,
    last_attempted_run_at: new Date().toISOString(),
    next_suggested_run_at: computeNextSuggestedRun(startedAt),
    status,
    error_text: errors[0] ?? null,
  })

  await supabase.from("agent_events").insert({
    user_id: userId,
    agent_name: "Hermes",
    run_id: runData.id,
    event_type: "assistant_run",
    action: llmBrief ? "generate_brief_llm" : "generate_brief_fallback",
    status: status === "failed" ? "failed" : status === "partial_failure" ? "warning" : "success",
    summary: llmBrief
      ? `Brief generated via ${ASSISTANT_MODEL}.`
      : "Brief generated via rule-based fallback (no OpenRouter key or call failed).",
    error_text: errors[0] ?? null,
  })

  return {
    status,
    summary: finalSummary,
    topPriorities: finalTopPriorities,
    firstFocusBlock: focus.firstFocusBlock,
    focusNote: focus.focusNote,
    risks: finalRisks,
    nextActions: finalNextActions,
    changes,
    errors,
    sources: {
      calendar: calendarResult.report,
      gmail: gmailResult.report,
    },
  } satisfies AssistantResult
}
