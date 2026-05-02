"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isEmailAllowed } from "@/lib/allowlist"
import { hasSupabaseEnv, getSupabaseBrowser } from "@/lib/supabase-browser"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  async function signIn() {
    if (!supabase || !email.trim()) return
    if (!isEmailAllowed(email)) {
      setBlocked(true)
      return
    }
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    ).replace(/\/$/, "")
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${appUrl}/auth/callback` },
    })
    setSent(true)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_10%,oklch(0.65_0.18_240_/_0.18),transparent_34%),radial-gradient(circle_at_80%_30%,oklch(0.65_0.22_290_/_0.16),transparent_30%)]" />
      <section className="relative w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white text-black">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Focus OS</h1>
            <p className="text-sm text-white/45">Magic-link sign in</p>
          </div>
        </div>

        {!hasSupabaseEnv() ? (
          <div className="rounded-md border border-white/[0.08] bg-black/20 p-4 text-sm text-white/60">
            Add Supabase env keys to enable sign-in. Local UI is ready.
          </div>
        ) : blocked ? (
          <div className="rounded-md border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
            Email not allowed for this workspace.
          </div>
        ) : sent ? (
          <div className="rounded-md border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 p-4 text-sm text-blue-100">
            Check email for sign-in link.
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setBlocked(false)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") signIn()
              }}
              className="border-white/[0.08] bg-white/[0.05]"
            />
            <Button className="w-full gap-2" onClick={signIn}>
              Send link
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          className="mt-4 w-full text-white/60"
          onClick={() => router.push("/")}
        >
          Back to app
        </Button>
      </section>
    </main>
  )
}
