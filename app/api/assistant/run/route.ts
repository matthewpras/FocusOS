import { NextRequest, NextResponse } from "next/server"
import { runAssistant, shouldRunForSchedule } from "@/lib/assistant"
import { getSupabaseServerAdmin, getSupabaseServerAuthClient } from "@/lib/supabase-server"

function resolveAutomationEmail() {
  return (
    process.env.ASSISTANT_USER_EMAIL ||
    process.env.NEXT_PUBLIC_ALLOWED_EMAILS?.split(",").map((item) => item.trim())[0] ||
    null
  )
}

async function resolveUserIdFromToken(token: string) {
  const supabase = getSupabaseServerAuthClient()
  if (!supabase) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

async function resolveCronUserId() {
  const supabase = getSupabaseServerAdmin()
  const email = resolveAutomationEmail()
  if (!supabase || !email) return null

  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (error) return null
  return data.users.find((user) => user.email === email)?.id ?? null
}

async function handleRun(request: NextRequest, trigger: "manual" | "cron") {
  const authHeader = request.headers.get("authorization")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null
  const cronSecret = process.env.CRON_SECRET
  const isCron = Boolean(bearerToken && cronSecret && bearerToken === cronSecret)

  let userId: string | null = null

  if (isCron) {
    const shouldRun = await shouldRunForSchedule(new Date())
    if (!shouldRun) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Outside configured Focus OS run window.",
      })
    }

    userId = await resolveCronUserId()
  } else if (bearerToken) {
    userId = await resolveUserIdFromToken(bearerToken)
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
  }

  try {
    const result = await runAssistant(userId, trigger)
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Assistant run failed.",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return handleRun(request, "cron")
}

export async function POST(request: NextRequest) {
  return handleRun(request, "manual")
}
