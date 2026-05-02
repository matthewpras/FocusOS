"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    if (!supabase) {
      router.replace("/sign-in")
      return
    }
    supabase.auth.getSession().finally(() => router.replace("/"))
  }, [router])

  return (
    <main className="grid min-h-screen place-items-center bg-background text-white">
      Signing in...
    </main>
  )
}
