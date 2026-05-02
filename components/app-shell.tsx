"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { CaptureFAB } from "@/components/capture-fab"
import { CaptureModal } from "@/components/capture-modal"
import { MobileNav } from "@/components/mobile-nav"
import { SetupNotice } from "@/components/setup-notice"
import { useAuth } from "@/hooks/use-auth"
import { useCaptures } from "@/hooks/useCaptures"
import { isEmailAllowed } from "@/lib/allowlist"
import { hasSupabaseEnv } from "@/lib/supabase-browser"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const captures = useCaptures(user?.id)
  const router = useRouter()
  const configured = hasSupabaseEnv()
  const allowed = isEmailAllowed(user?.email)

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/sign-in")
  }, [configured, loading, router, user])

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-white">
        <div className="h-2 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
        </div>
      </main>
    )
  }

  if (configured && !user) return null

  if (configured && user && !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-white">
        <section className="w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.04] p-6 text-center backdrop-blur-xl">
          <h1 className="text-xl font-semibold">Access limited</h1>
          <p className="mt-2 text-sm text-white/55">
            {user.email} is signed in, but not allowed for this Focus OS workspace.
          </p>
          <button
            className="mt-5 h-9 rounded-lg bg-white px-4 text-sm font-medium text-black"
            onClick={() => signOut()?.then(() => router.replace("/sign-in"))}
          >
            Sign out
          </button>
        </section>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,oklch(0.65_0.18_240_/_0.16),transparent_32%),radial-gradient(circle_at_90%_12%,oklch(0.65_0.22_290_/_0.18),transparent_28%)]" />
      <div className="relative flex">
        <AppSidebar
          email={user?.email ?? "Supabase setup pending"}
          inboxCount={captures.captures.length}
          onSignOut={() => signOut()?.then(() => router.replace("/sign-in"))}
        />
        <main className="min-h-screen flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-6xl space-y-6">
            <SetupNotice />
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
      <CaptureFAB />
      <CaptureModal onSave={captures.addCapture} />
    </div>
  )
}
