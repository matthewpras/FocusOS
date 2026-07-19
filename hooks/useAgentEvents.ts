"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { AgentEvent, BoardRecommendation } from "@/types"

export function useAgentEvents(userId?: string) {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [recommendations, setRecommendations] = useState<BoardRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [eventsResult, recommendationsResult] = await Promise.all([
      supabase
        .from("agent_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("board_recommendations")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    if (eventsResult.error || recommendationsResult.error) {
      setError("Couldn't load Hermes activity.")
    } else {
      setError(null)
      setEvents((eventsResult.data ?? []) as AgentEvent[])
      setRecommendations((recommendationsResult.data ?? []) as BoardRecommendation[])
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`agent-events-${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_events",
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
          table: "board_recommendations",
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

  async function setRecommendationStatus(id: string, status: "accepted" | "dismissed") {
    if (!supabase) return
    setRecommendations((items) => items.filter((item) => item.id !== id))
    await supabase.from("board_recommendations").update({ status }).eq("id", id)
  }

  return { events, recommendations, loading, error, refresh, setRecommendationStatus }
}
