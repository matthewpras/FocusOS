import { getAllowedEmails } from "@/lib/allowlist"
import { getSupabaseServerAdmin } from "@/lib/supabase-server"

export function resolveAutomationEmail() {
  return process.env.ASSISTANT_USER_EMAIL || getAllowedEmails("server")[0] || null
}

export async function resolveCronUserId() {
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

export function isCronRequest(bearerToken: string | null) {
  const cronSecret = process.env.CRON_SECRET
  return Boolean(bearerToken && cronSecret && bearerToken === cronSecret)
}
