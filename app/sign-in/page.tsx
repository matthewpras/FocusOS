"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, KeyRound, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAllowedEmails } from "@/lib/allowlist"
import {
  getPasswordAuthSuccessMessage,
  type PasswordAuthAction,
  validatePasswordAuthInput,
} from "@/lib/auth-form"
import { hasSupabaseEnv, getSupabaseBrowser } from "@/lib/supabase-browser"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<PasswordAuthAction | null>(null)
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const allowedEmails = getAllowedEmails("client")

  async function submit(action: PasswordAuthAction) {
    if (!supabase) return

    setMessage(null)
    setError(null)

    const validated = validatePasswordAuthInput({
      email,
      password,
      allowlist: allowedEmails,
    })

    if (!validated.ok) {
      setError(validated.error)
      return
    }

    setLoadingAction(action)

    try {
      if (action === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        })

        if (error) throw error

        setMessage(getPasswordAuthSuccessMessage(action))
        router.replace("/")
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
      })

      if (error) throw error

      if (data.session) {
        setMessage("Account created. Redirecting…")
        router.replace("/")
        return
      }

      setMessage(
        "Account created, but Supabase email confirmation is still enabled. Disable email confirmation for this private app or confirm once, then sign in.",
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate.")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--today-bg)] px-4 text-[var(--today-ink)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_30%_10%,oklch(0.65_0.18_240_/_0.18),transparent_34%),radial-gradient(circle_at_80%_30%,oklch(0.65_0.22_290_/_0.16),transparent_30%)]" />
      <section className="relative w-full max-w-md rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white text-black">
            <KeyRound className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Focus OS</h1>
            <p className="text-sm text-[var(--today-muted)]">Private password sign in</p>
          </div>
        </div>

        {!hasSupabaseEnv() ? (
          <div className="rounded-md border border-[var(--today-line)] bg-[var(--today-panel)] p-4 text-sm text-[var(--today-muted)]">
            Add Supabase env keys to enable sign-in. Local UI is ready.
          </div>
        ) : (
          <div className="space-y-3">
            {error ? (
              <div role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {message ? (
              <div role="status" className="rounded-md border border-[var(--today-blue)]/30 bg-[var(--today-blue)]/10 p-4 text-sm text-blue-100">
                {message}
              </div>
            ) : null}

            <div>
              <label htmlFor="sign-in-email" className="mb-1.5 block text-xs font-medium text-[var(--today-muted)]">
                Email
              </label>
              <Input
                id="sign-in-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit("sign-in")
                }}
                className="border-[var(--today-line)] bg-[var(--today-panel)]"
              />
            </div>
            <div>
              <label htmlFor="sign-in-password" className="mb-1.5 block text-xs font-medium text-[var(--today-muted)]">
                Password
              </label>
              <Input
                id="sign-in-password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit("sign-in")
                }}
                className="border-[var(--today-line)] bg-[var(--today-panel)]"
              />
            </div>
            <Button
              className="w-full gap-2"
              disabled={loadingAction !== null}
              onClick={() => void submit("sign-in")}
            >
              {loadingAction === "sign-in" ? "Signing in..." : "Sign in"}
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="secondary"
              className="w-full gap-2"
              disabled={loadingAction !== null}
              onClick={() => void submit("sign-up")}
            >
              {loadingAction === "sign-up" ? "Creating account..." : "Create account"}
              <UserPlus className="size-4" />
            </Button>
            <p className="text-xs text-[var(--today-muted)]">
              For this private app, create the account once with your allowed email, then keep using password sign-in.
            </p>
          </div>
        )}

        <Button
          variant="ghost"
          className="mt-4 w-full text-[var(--today-muted)]"
          onClick={() => router.push("/")}
        >
          Back to app
        </Button>
      </section>
    </main>
  )
}
