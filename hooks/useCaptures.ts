"use client"

import { useCallback, useEffect, useState } from "react"
import { getRealtimeChannelName } from "@/lib/realtime-channel"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { Capture } from "@/types"

export function useCaptures(userId?: string) {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("captures")
      .select("*")
      .eq("converted", false)
      .order("created_at", { ascending: false })
    setCaptures((data ?? []) as Capture[])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(getRealtimeChannelName("captures", userId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "captures",
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

  async function addCapture(text: string) {
    if (!supabase || !userId || !text.trim()) return
    await supabase.from("captures").insert({ user_id: userId, text: text.trim() })
    await refresh()
  }

  async function discardCapture(id: string) {
    if (!supabase) return
    setCaptures((items) => items.filter((capture) => capture.id !== id))
    await supabase.from("captures").delete().eq("id", id)
  }

  async function markConverted(id: string) {
    if (!supabase) return
    setCaptures((items) => items.filter((capture) => capture.id !== id))
    await supabase.from("captures").update({ converted: true }).eq("id", id)
  }

  return { captures, loading, addCapture, discardCapture, markConverted, refresh }
}
