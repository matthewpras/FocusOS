"use client"

import { useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowser()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [supabase])

  return {
    user: session?.user ?? null,
    session,
    loading,
    signOut: () => supabase?.auth.signOut(),
  }
}

export type AuthedUser = User
