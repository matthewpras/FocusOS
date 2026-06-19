import { NextRequest, NextResponse } from "next/server"
import { getBearerToken, verifyAccessToken } from "@/lib/server-auth"

export async function GET(request: NextRequest) {
  const verification = await verifyAccessToken(
    getBearerToken(request.headers.get("authorization")),
  )

  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, error: verification.error, allowed: false },
      { status: verification.status },
    )
  }

  return NextResponse.json({
    ok: true,
    allowed: true,
    user: verification.user,
  })
}