"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { AssistantSourceState, ExternalCommitment } from "@/types"

export function useExternalCommitments(userId?: string) {
  const [commitments, setCommitments] = useState<ExternalCommitment[]>([])
  const [sourceState, setSourceState] = useState<AssistantSourceState | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [commitmentsResult, stateResult] = await Promise.all([
      supabase
        .from("external_commitments")
        .select("*")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("assistant_source_states")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
    ])

    setCommitments((commitmentsResult.data ?? []) as ExternalCommitment[])
    setSourceState((stateResult.data ?? null) as AssistantSourceState | null)
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`external-commitments-${userId}`)
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
      commitments.filter(
        (item) => item.source === "google_calendar" && Boolean(item.starts_at),
      ),
    [commitments],
  )

  const inboxSignals = useMemo(
    () => commitments.filter((item) => item.source === "gmail"),
    [commitments],
  )

  return {
    commitments,
    upcomingEvents,
    inboxSignals,
    sourceState,
    loading,
    refresh,
  }
}