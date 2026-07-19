import type { createHermesSupabaseAdmin } from "./client"

type HermesSupabase = ReturnType<typeof createHermesSupabaseAdmin>

type ReadContext = {
  supabase: HermesSupabase
  userId: string
}

export async function getOpenCaptures(context: ReadContext, limit = 50) {
  const { data, error } = await context.supabase
    .from("captures")
    .select("*")
    .eq("user_id", context.userId)
    .eq("converted", false)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getTasks(
  context: ReadContext,
  opts: { completed?: boolean; limit?: number } = {},
) {
  let query = context.supabase
    .from("tasks")
    .select("*")
    .eq("user_id", context.userId)

  if (typeof opts.completed === "boolean") {
    query = query.eq("completed", opts.completed)
  }

  const { data, error } = await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 200)

  if (error) throw error
  return data ?? []
}

export async function getOpenTasksDueBy(context: ReadContext, isoDate: string) {
  const { data, error } = await context.supabase
    .from("tasks")
    .select("*")
    .eq("user_id", context.userId)
    .eq("completed", false)
    .not("due_date", "is", null)
    .lte("due_date", isoDate)
    .order("due_date", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getLatestBrief(context: ReadContext) {
  const { data, error } = await context.supabase
    .from("assistant_briefs")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

export async function getRecentAgentEvents(context: ReadContext, limit = 50) {
  const { data, error } = await context.supabase
    .from("agent_events")
    .select("*")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getUpcomingCommitments(context: ReadContext, limit = 20) {
  const { data, error } = await context.supabase
    .from("external_commitments")
    .select("*")
    .eq("user_id", context.userId)
    .eq("source", "google_calendar")
    .order("starts_at", { ascending: true })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getOpenDecisions(context: ReadContext) {
  const { data, error } = await context.supabase
    .from("decisions")
    .select("*")
    .eq("user_id", context.userId)
    .eq("status", "open")
    .order("decide_by", { ascending: true, nullsFirst: false })

  if (error) throw error
  return data ?? []
}
