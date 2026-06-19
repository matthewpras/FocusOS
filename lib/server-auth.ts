import { isEmailAllowed } from "@/lib/allowlist"
import { getSupabaseServerAuthClient } from "@/lib/supabase-server"

export type VerifiedAppUser = {
  id: string
  email: string | null
}

export type VerificationResult =
  | { ok: true; user: VerifiedAppUser }
  | { ok: false; status: number; error: string }

export function getBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Bearer ")) return null
  return authorizationHeader.slice("Bearer ".length)
}

export async function verifyAccessToken(
  accessToken: string | null | undefined,
): Promise<VerificationResult> {
  if (!accessToken) {
    return { ok: false, status: 401, error: "Unauthorized." }
  }

  const supabase = getSupabaseServerAuthClient()
  if (!supabase) {
    return { ok: false, status: 503, error: "Supabase auth is not configured." }
  }

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Unauthorized." }
  }

  if (!isEmailAllowed(data.user.email, "server")) {
    return { ok: false, status: 403, error: "Forbidden." }
  }

  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
  }
}