import { createClient } from "@supabase/supabase-js"

const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function hasSupabaseServerEnv() {
  return Boolean(appUrl && anonKey && serviceRoleKey)
}

export function getSupabaseServerAdmin() {
  if (!appUrl || !serviceRoleKey) return null

  return createClient(appUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getSupabaseServerAuthClient() {
  if (!appUrl || !anonKey) return null

  return createClient(appUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
