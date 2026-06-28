import { createRequire } from "node:module"
import type { HermesEnv } from "./env"

const require = createRequire(import.meta.url)

type UserListClient = {
  auth: {
    admin: {
      listUsers(args: {
        page: number
        perPage: number
      }): Promise<{
        data: { users: Array<{ id: string; email?: string | null }> }
        error: Error | null
      }>
    }
  }
}

export function createHermesSupabaseAdmin(env: HermesEnv) {
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js")

  return createClient(
    env.FOCUSOS_SUPABASE_URL,
    env.FOCUSOS_SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

export async function resolveUserIdByEmail(
  supabase: UserListClient,
  email: string,
) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (error) throw error

  const user = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
  )

  if (!user) {
    throw new Error(`No FocusOS user found for ${email}.`)
  }

  return user.id
}
