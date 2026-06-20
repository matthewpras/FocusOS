"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { EmailOtpType } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

function getSafeNextPath(next: string | null) {
  return next && next.startsWith("/") ? next : "/"
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    if (!supabase) {
      router.replace("/sign-in")
      return
    }
    const browserClient = supabase

    let cancelled = false

    async function completeSignIn() {
      const url = new URL(window.location.href)
      const nextPath = getSafeNextPath(url.searchParams.get("next"))
      const code = url.searchParams.get("code")
      const tokenHash = url.searchParams.get("token_hash")
      const type = url.searchParams.get("type") as EmailOtpType | null

      try {
        if (code) {
          const { error } = await browserClient.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash && type) {
          const { error } = await browserClient.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          })
          if (error) throw error
        } else {
          const { data, error } = await browserClient.auth.getSession()
          if (error) throw error
          if (!data.session) {
            throw new Error("Missing auth session in callback.")
          }
        }

        if (!cancelled) router.replace(nextPath)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "Unable to complete sign-in."
        setError(message)
      }
    }

    void completeSignIn()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.04] p-6 text-center backdrop-blur-xl">
        <h1 className="text-xl font-semibold">{error ? "Sign-in failed" : "Signing in..."}</h1>
        <p className="mt-2 text-sm text-white/60">
          {error ?? "Completing your secure login."}
        </p>
        {error ? (
          <button
            className="mt-5 h-9 rounded-lg bg-white px-4 text-sm font-medium text-black"
            onClick={() => router.replace("/sign-in")}
          >
            Back to sign in
          </button>
        ) : null}
      </section>
    </main>
  )
}
