"use client"

import { useRouter } from "next/navigation"
import { Suspense, useEffect, useMemo, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { AssistantChatPanel } from "@/components/assistant-chat-panel"
import { CaptureFAB } from "@/components/capture-fab"
import { CaptureModal } from "@/components/capture-modal"
import { CommandPalette } from "@/components/command-palette"
import { MobileNav } from "@/components/mobile-nav"
import { SetupNotice } from "@/components/setup-notice"
import { UndoToast } from "@/components/undo-toast"
import { useAuth } from "@/hooks/use-auth"
import { useCaptures } from "@/hooks/useCaptures"
import { useTasks } from "@/hooks/useTasks"
import { hasSupabaseEnv } from "@/lib/supabase-browser"
import type { Category } from "@/types"

type AppShellProps = {
  children: React.ReactNode
  chrome?: "default" | "today"
}

export function AppShell({ children, chrome = "default" }: AppShellProps) {
  const { user, session, loading, signOut } = useAuth()
  const captures = useCaptures(user?.id)
  const tasks = useTasks(user?.id)
  const router = useRouter()
  const configured = hasSupabaseEnv()
  const [accessAllowed, setAccessAllowed] = useState<boolean | null>(null)

  const projectCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {}
    for (const task of tasks.tasks) {
      if (task.completed || !task.category) continue
      counts[task.category] = (counts[task.category] ?? 0) + 1
    }
    return counts
  }, [tasks.tasks])

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/sign-in")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id is the stable identity we care about; `user` itself is a new object reference on every auth event
  }, [configured, loading, router, user?.id])

  useEffect(() => {
    let cancelled = false

    async function verifyAccess() {
      if (!configured || !user || !session?.access_token) {
        if (!cancelled) setAccessAllowed(null)
        return
      }

      const response = await fetch("/api/auth/allowed", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (cancelled) return
      setAccessAllowed(response.ok)
    }

    void verifyAccess()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id is the stable identity we care about; `user` itself is a new object reference on every auth event
  }, [configured, session?.access_token, user?.id])

  if (loading || (configured && user && accessAllowed === null)) {
    return (
      <main
        role="status"
        aria-live="polite"
        className="grid min-h-screen place-items-center bg-[var(--today-bg)] text-white"
      >
        <span className="sr-only">Loading Focus OS…</span>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
        </div>
      </main>
    )
  }

  if (configured && !user) return null

  if (configured && user && accessAllowed === false) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--today-bg)] px-4 text-[var(--today-ink)]">
        <section className="w-full max-w-md rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-6 text-center backdrop-blur-xl">
          <h1 className="text-xl font-semibold">Access limited</h1>
          <p className="mt-2 text-sm text-[var(--today-muted)]">
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
    <div className="min-h-screen bg-[var(--today-bg)] bg-[radial-gradient(circle_at_78%_0%,oklch(0.24_0.055_260)_0,transparent_30rem),linear-gradient(180deg,oklch(0.13_0.019_252),var(--today-bg)_22rem)] text-[var(--today-ink)]">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-white focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-black"
      >
        Skip to content
      </a>
      <div className="relative flex min-h-screen">
        <Suspense fallback={null}>
          <AppSidebar
            email={user?.email ?? "Supabase setup pending"}
            inboxCount={captures.captures.length}
            projectCounts={projectCounts}
            onSignOut={() => signOut()?.then(() => router.replace("/sign-in"))}
          />
        </Suspense>
        <main
          id="main-content"
          className={
            chrome === "today"
              ? "min-w-0 flex-1"
              : "min-w-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-5 sm:px-6 lg:px-8 lg:pb-10"
          }
        >
          {chrome === "today" ? (
            <>
              <SetupNotice />
              {children}
            </>
          ) : (
            <div className="mx-auto max-w-6xl space-y-6">
              <SetupNotice />
              {children}
            </div>
          )}
        </main>
      </div>
      <MobileNav />
      {chrome === "default" ? <CaptureFAB /> : null}
      <CaptureModal onSave={captures.addCapture} />
      <CommandPalette />
      <AssistantChatPanel />
      <UndoToast />
    </div>
  )
}
