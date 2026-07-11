"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { buildCaptureText, extractCaptureLinks } from "@/lib/capture-payload"
import type { Capture, RichCaptureInput } from "@/types"

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
      .channel(`captures-${userId}-${crypto.randomUUID()}`)
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

  async function addCapture(input: string | RichCaptureInput) {
    if (!supabase || !userId) return

    const richInput =
      typeof input === "string"
        ? { note: input }
        : input
    const links = extractCaptureLinks([
      richInput.note,
      ...(richInput.links ?? []).map((link) => link.url),
    ])
    const mediaItems = richInput.mediaItems ?? []
    const text = buildCaptureText({ note: richInput.note, links })

    if (!text.trim() && !mediaItems.length) return

    const { data: capture, error } = await supabase
      .from("captures")
      .insert({
        user_id: userId,
        text: text.trim() || "Media capture",
        obsidian_export_status: "pending",
      })
      .select("id")
      .single()

    if (error || !capture) return

    await supabase.from("capture_intake").insert({
      user_id: userId,
      capture_id: capture.id,
      intake_type: "obsidian_note",
      title: richInput.note.trim().split("\n")[0]?.slice(0, 90) || "Media capture",
      source_link: links[0]?.url ?? null,
      obsidian_target: richInput.obsidianTarget?.trim() || "Inbox",
      raw_note: richInput.note.trim() || null,
      links,
      media_items: mediaItems,
      payload: {
        capture_version: 1,
        source: "focusos.capture",
        note: richInput.note.trim(),
        links,
        media_items: mediaItems,
      },
      agent_status: "queued",
      assistant_source: "Hermes",
    })

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
