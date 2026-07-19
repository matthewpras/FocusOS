import { NextRequest, NextResponse } from "next/server"
import { runAssistant, shouldRunForSchedule } from "@/lib/assistant"
import { getBearerToken, verifyAccessToken } from "@/lib/server-auth"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"
import { isCronRequest, resolveCronUserId } from "@/lib/cron-user"

async function handleRun(request: NextRequest, trigger: "manual" | "cron") {
  const bearerToken = getBearerToken(request.headers.get("authorization"))
  const isCron = isCronRequest(bearerToken)

  let userId: string | null = null

  if (isCron) {
    userId = await resolveCronUserId()

    if (userId) {
      const supabase = getSupabaseServerAdmin()
      const sourceState = supabase
        ? (
            await supabase
              .from("assistant_source_states")
              .select("last_attempted_run_at")
              .eq("user_id", userId)
              .maybeSingle()
          ).data
        : null

      if (!shouldRunForSchedule(new Date(), sourceState?.last_attempted_run_at ?? null)) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: "Assistant ran recently; skipping until the next scheduled interval.",
        })
      }
    }
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
    const failed = result.status === "failed"
    const partialFailure = result.status === "partial_failure"
    const status = failed ? 500 : partialFailure ? 424 : 200

    return NextResponse.json(
      {
        ok: !failed && !partialFailure,
        result,
        error:
          failed || partialFailure
            ? result.errors[0] ?? "Assistant run completed with source errors."
            : undefined,
      },
      { status },
    )
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
