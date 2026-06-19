"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import type { AssistantBrief, AssistantRun, AssistantSourceState } from "@/types"
import { getSupabaseBrowser } from "@/lib/supabase-browser"

type RunResponse = {
  ok: boolean
  error?: string
}

export function useAssistant(userId?: string, accessToken?: string) {
  const [brief, setBrief] = useState<AssistantBrief | null>(null)
  const [latestRun, setLatestRun] = useState<AssistantRun | null>(null)
  const [sourceState, setSourceState] = useState<AssistantSourceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const [briefResult, runResult, stateResult] = await Promise.all([
      supabase
        .from("assistant_briefs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("assistant_runs")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("assistant_source_states")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

    setBrief((briefResult.data ?? null) as AssistantBrief | null)
    setLatestRun((runResult.data ?? null) as AssistantRun | null)
    setSourceState((stateResult.data ?? null) as AssistantSourceState | null)
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`assistant-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assistant_briefs",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assistant_runs",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assistant_source_states",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh, supabase, userId])

  async function runNow() {
    if (!accessToken) {
      setError("Sign in again before running assistant.")
      return
    }

    startTransition(async () => {
      setError(null)
      const response = await fetch("/api/assistant/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = (await response.json()) as RunResponse

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Assistant run failed.")
        return
      }

      await refresh()
    })
  }

  return {
    brief,
    latestRun,
    sourceState,
    loading,
    error,
    running: isPending,
    runNow,
    refresh,
  }
}
