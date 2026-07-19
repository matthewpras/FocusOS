"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { AssistantSourceState, ExternalCommitment } from "@/types"

export function useExternalCommitments(userId?: string) {
  const [commitments, setCommitments] = useState<ExternalCommitment[]>([])
  const [sourceState, setSourceState] = useState<AssistantSourceState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [eventsResult, signalsResult, stateResult] = await Promise.all([
      supabase
        .from("external_commitments")
        .select("*")
        .eq("source", "google_calendar")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(20),
      supabase
        .from("external_commitments")
        .select("*")
        .eq("source", "gmail")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("assistant_source_states")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

    if (eventsResult.error || signalsResult.error) {
      setError("Couldn't load calendar and inbox signals.")
    } else {
      setError(null)
      setCommitments([
        ...((eventsResult.data ?? []) as ExternalCommitment[]),
        ...((signalsResult.data ?? []) as ExternalCommitment[]),
      ])
    }
    setSourceState((stateResult.data ?? null) as AssistantSourceState | null)
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`external-commitments-${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "external_commitments",
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

  const upcomingEvents = useMemo(
    () =>
      commitments
        .filter((item) => item.source === "google_calendar" && Boolean(item.starts_at))
        .sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? "")),
    [commitments],
  )

  const inboxSignals = useMemo(
    () => commitments.filter((item) => item.source === "gmail"),
    [commitments],
  )

  const dismiss = useCallback(
    async (id: string) => {
      if (!supabase) return
      await supabase.from("external_commitments").delete().eq("id", id)
      await refresh()
    },
    [supabase, refresh],
  )

  return {
    commitments,
    upcomingEvents,
    inboxSignals,
    sourceState,
    loading,
    error,
    refresh,
    dismiss,
  }
}
