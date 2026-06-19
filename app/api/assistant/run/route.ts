import { NextRequest, NextResponse } from "next/server"
import { runAssistant, shouldRunForSchedule } from "@/lib/assistant"
import { getAllowedEmails } from "@/lib/allowlist"
import { getBearerToken, verifyAccessToken } from "@/lib/server-auth"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"

function resolveAutomationEmail() {
  return (
    process.env.ASSISTANT_USER_EMAIL ||
    getAllowedEmails("server")[0] ||
    null
  )
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
  const bearerToken = getBearerToken(request.headers.get("authorization"))
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
    const verification = await verifyAccessToken(bearerToken)
    if (!verification.ok) {
      return NextResponse.json(
        { ok: false, error: verification.error },
        { status: verification.status },
      )
    }
    userId = verification.user.id
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
