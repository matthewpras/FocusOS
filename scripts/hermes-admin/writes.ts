import { buildAgentEvent, buildProvenance } from "./provenance.ts"
import type { createHermesSupabaseAdmin } from "./client"
import type { HermesEnv } from "./env"
import type { SourceKind } from "./provenance"

type HermesSupabase = ReturnType<typeof createHermesSupabaseAdmin>
type Priority = "low" | "medium" | "high"

type WriteContext = {
  supabase: HermesSupabase
  userId: string
  agentName: HermesEnv["FOCUSOS_AGENT_NAME"]
  runId?: string | null
}

type ProvenanceInput = {
  sourceKind?: SourceKind | null
  sourceRef?: string | null
  confidence?: number | null
}

type AuditInput = {
  eventType: string
  targetTable?: string | null
  targetId?: string | null
  action: string
  status?: "success" | "warning" | "failed"
  summary?: string | null
  payload?: Record<string, unknown>
  errorText?: string | null
}

export async function logAgentEvent(context: WriteContext, input: AuditInput) {
  const { error } = await context.supabase.from("agent_events").insert(
    buildAgentEvent({
      userId: context.userId,
      agentName: context.agentName,
      runId: context.runId,
      ...input,
    }),
  )

  if (error) throw error
}

export async function withAudit<T>(
  context: WriteContext,
  audit: {
    eventType: string
    action: string
    summary: string
    targetTable?: string | null
    targetId?: string | null
    payload?: Record<string, unknown>
  },
  actionFn: () => Promise<T>,
) {
  const result = await actionFn()
  await logAgentEvent(context, { status: "success", ...audit })
  return result
}

function provenance(context: WriteContext, input: ProvenanceInput) {
  return buildProvenance({
    agentName: context.agentName,
    runId: context.runId,
    sourceKind: input.sourceKind ?? "hermes_direct",
    sourceRef: input.sourceRef,
    confidence: input.confidence,
    updatedBy: context.agentName,
  })
}

export async function createCaptureIntake(
  context: WriteContext,
  input: ProvenanceInput & {
    captureId?: string | null
    intakeType:
      | "task"
      | "event"
      | "obsidian_note"
      | "school_item"
      | "follow_up"
      | "finance_item"
      | "automation_idea"
      | "ignore"
      | "decision_needed"
    title?: string | null
    summary?: string | null
    sourceLink?: string | null
    tags?: string[]
    keyTakeaways?: unknown[]
    whatThisMeansForMe?: string | null
    obsidianTarget?: string | null
    decisionNeeded?: boolean
  },
) {
  const payload = {
    user_id: context.userId,
    capture_id: input.captureId ?? null,
    intake_type: input.intakeType,
    title: input.title ?? null,
    summary: input.summary ?? null,
    source_link: input.sourceLink ?? null,
    tags: input.tags ?? [],
    key_takeaways: input.keyTakeaways ?? [],
    what_this_means_for_me: input.whatThisMeansForMe ?? null,
    obsidian_target: input.obsidianTarget ?? null,
    decision_needed: input.decisionNeeded ?? false,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("capture_intake")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "capture_intake",
    targetId: data.id,
    action: "create_capture_intake",
    summary: `Created capture intake: ${input.title ?? input.intakeType}`,
    payload,
  })

  return data.id as string
}

export async function upsertTask(
  context: WriteContext,
  input: ProvenanceInput & {
    taskId?: string
    text: string
    priority?: Priority
    dueDate?: string | null
    category?: "work" | "personal" | "health" | "other" | null
    projectId?: string | null
    domainId?: string | null
    slipping?: boolean
  },
) {
  const payload = {
    user_id: context.userId,
    text: input.text,
    priority: input.priority ?? "medium",
    due_date: input.dueDate ?? null,
    category: input.category ?? "other",
    project_id: input.projectId ?? null,
    domain_id: input.domainId ?? null,
    slipping: input.slipping ?? false,
    ...provenance(context, input),
  }

  const query = input.taskId
    ? context.supabase
        .from("tasks")
        .update(payload)
        .eq("id", input.taskId)
        .select("id")
        .single()
    : context.supabase.from("tasks").insert(payload).select("id").single()

  const { data, error } = await query
  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "tasks",
    targetId: data.id,
    action: "upsert_task",
    summary: `Upserted task: ${input.text}`,
    payload,
  })

  return data.id as string
}

export async function writeBrief(
  context: WriteContext,
  input: ProvenanceInput & {
    summary: string
    topPriorities: string[]
    risks: string[]
    nextActions: string[]
    firstFocusBlock?: string | null
    focusNote?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    summary: input.summary,
    top_priorities: input.topPriorities,
    risks: input.risks,
    next_actions: input.nextActions,
    first_focus_block: input.firstFocusBlock ?? null,
    focus_note: input.focusNote ?? null,
    changed: true,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("assistant_briefs")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "assistant_briefs",
    targetId: data.id,
    action: "write_brief",
    summary: "Wrote assistant brief",
    payload,
  })

  return data.id as string
}

export async function writeBoardRecommendation(
  context: WriteContext,
  input: ProvenanceInput & {
    agentName: HermesEnv["FOCUSOS_AGENT_NAME"]
    title: string
    summary: string
    recommendationType:
      | "priority"
      | "risk"
      | "decision"
      | "review"
      | "school"
      | "finance"
      | "systems"
      | "health"
    priority?: Priority
    domainId?: string | null
    projectId?: string | null
    supportingPoints?: unknown[]
    suggestedActions?: unknown[]
    expiresAt?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    domain_id: input.domainId ?? null,
    project_id: input.projectId ?? null,
    agent_name: input.agentName,
    title: input.title,
    summary: input.summary,
    recommendation_type: input.recommendationType,
    priority: input.priority ?? "medium",
    supporting_points: input.supportingPoints ?? [],
    suggested_actions: input.suggestedActions ?? [],
    expires_at: input.expiresAt ?? null,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("board_recommendations")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "board_recommendations",
    targetId: data.id,
    action: "write_board_recommendation",
    summary: `Wrote board recommendation: ${input.title}`,
    payload,
  })

  return data.id as string
}

export async function logDecision(
  context: WriteContext,
  input: ProvenanceInput & {
    title: string
    description?: string | null
    status?: "open" | "decided" | "archived"
    urgency?: Priority
    recommendedOption?: string | null
    chosenOption?: string | null
    decideBy?: string | null
    domainId?: string | null
    projectId?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "open",
    urgency: input.urgency ?? "medium",
    recommended_option: input.recommendedOption ?? null,
    chosen_option: input.chosenOption ?? null,
    decide_by: input.decideBy ?? null,
    domain_id: input.domainId ?? null,
    project_id: input.projectId ?? null,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("decisions")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "decisions",
    targetId: data.id,
    action: "log_decision",
    summary: `Logged decision: ${input.title}`,
    payload,
  })

  return data.id as string
}

export async function upsertExternalCommitment(
  context: WriteContext,
  input: ProvenanceInput & {
    source: "google_calendar" | "gmail"
    sourceId: string
    title: string
    details?: string | null
    startsAt?: string | null
    dueDate?: string | null
    actionHint?: string | null
    payload?: Record<string, unknown>
  },
) {
  const payload = {
    user_id: context.userId,
    source: input.source,
    source_id: input.sourceId,
    title: input.title,
    details: input.details ?? null,
    starts_at: input.startsAt ?? null,
    due_date: input.dueDate ?? null,
    action_hint: input.actionHint ?? null,
    payload: input.payload ?? {},
    ...provenance(context, {
      sourceKind: input.source === "google_calendar" ? "calendar_sync" : "gmail_sync",
      ...input,
    }),
  }

  const { data, error } = await context.supabase
    .from("external_commitments")
    .upsert(payload, { onConflict: "user_id,source,source_id" })
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "external_commitments",
    targetId: data.id,
    action: "upsert_external_commitment",
    summary: `Upserted external commitment: ${input.title}`,
    payload,
  })

  return data.id as string
}

export async function createSchoolItem(
  context: WriteContext,
  input: ProvenanceInput & {
    courseCode?: string | null
    courseName?: string | null
    itemType:
      | "class"
      | "exam"
      | "assignment"
      | "reading"
      | "study_block"
      | "admin"
      | "rotation"
      | "other"
    title: string
    description?: string | null
    status?: "open" | "done" | "archived"
    dueAt?: string | null
    startAt?: string | null
    priority?: Priority
    domainId?: string | null
    projectId?: string | null
  },
) {
  const payload = {
    user_id: context.userId,
    course_code: input.courseCode ?? null,
    course_name: input.courseName ?? null,
    item_type: input.itemType,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? "open",
    due_at: input.dueAt ?? null,
    start_at: input.startAt ?? null,
    priority: input.priority ?? "medium",
    domain_id: input.domainId ?? null,
    project_id: input.projectId ?? null,
    ...provenance(context, input),
  }

  const { data, error } = await context.supabase
    .from("school_items")
    .insert(payload)
    .select("id")
    .single()

  if (error) throw error

  await logAgentEvent(context, {
    eventType: "write",
    targetTable: "school_items",
    targetId: data.id,
    action: "create_school_item",
    summary: `Created school item: ${input.title}`,
    payload,
  })

  return data.id as string
}
