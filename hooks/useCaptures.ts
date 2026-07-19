"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { buildCaptureText, extractCaptureLinks } from "@/lib/capture-payload"
import { scheduleUndo } from "@/lib/undo-manager"
import type { Capture, CaptureIntake, RichCaptureInput } from "@/types"

const capturesChangedEvent = "focusos:captures-changed"

export type CaptureWithStatus = Capture & {
  agentStatus: CaptureIntake["agent_status"] | null
  title: string | null
  summary: string | null
  tags: string[]
  keyTakeaways: string[]
  whatThisMeansForMe: string | null
}

function notifyCapturesChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(capturesChangedEvent))
}

export function useCaptures(userId?: string) {
  const [captures, setCaptures] = useState<CaptureWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()
  const pendingDiscardIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from("captures")
      .select(
        "*, capture_intake(agent_status,title,summary,tags,key_takeaways,what_this_means_for_me)",
      )
      .eq("converted", false)
      .order("created_at", { ascending: false })
    if (fetchError) {
      setError("Couldn't load captures.")
    } else {
      setError(null)
      type IntakeFields = Pick<
        CaptureIntake,
        "agent_status" | "title" | "summary" | "tags" | "key_takeaways" | "what_this_means_for_me"
      >
      type Row = Capture & { capture_intake: IntakeFields[] | IntakeFields | null }
      const rows = (data ?? []) as Row[]
      const withStatus: CaptureWithStatus[] = rows.map((row) => {
        const { capture_intake, ...capture } = row
        const intake = Array.isArray(capture_intake) ? capture_intake[0] : capture_intake
        return {
          ...capture,
          agentStatus: intake?.agent_status ?? null,
          title: intake?.title ?? null,
          summary: intake?.summary ?? null,
          tags: intake?.tags ?? [],
          keyTakeaways: (intake?.key_takeaways as string[] | undefined) ?? [],
          whatThisMeansForMe: intake?.what_this_means_for_me ?? null,
        }
      })
      setCaptures(withStatus.filter((capture) => !pendingDiscardIds.current.has(capture.id)))
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    window.addEventListener(capturesChangedEvent, refresh)
    return () => {
      window.removeEventListener(capturesChangedEvent, refresh)
    }
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

    if (error || !capture) {
      throw new Error(error?.message || "Could not save capture.")
    }

    const { error: intakeError } = await supabase.from("capture_intake").insert({
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
    })

    if (intakeError) {
      console.error("Failed to create capture_intake row", intakeError)
    }

    await refresh()
    notifyCapturesChanged()
  }

  function discardCapture(id: string) {
    if (!supabase) return
    const capture = captures.find((item) => item.id === id)
    if (!capture) return

    pendingDiscardIds.current.add(id)
    setCaptures((items) => items.filter((item) => item.id !== id))
    scheduleUndo(
      id,
      `"${capture.text.slice(0, 40)}${capture.text.length > 40 ? "…" : ""}"`,
      async () => {
        await supabase.from("captures").delete().eq("id", id)
        pendingDiscardIds.current.delete(id)
        notifyCapturesChanged()
      },
      () => {
        pendingDiscardIds.current.delete(id)
        setCaptures((items) => (items.some((item) => item.id === id) ? items : [capture, ...items]))
      },
    )
  }

  async function markConverted(id: string) {
    if (!supabase) return
    setCaptures((items) => items.filter((capture) => capture.id !== id))
    await supabase.from("captures").update({ converted: true }).eq("id", id)
    notifyCapturesChanged()
  }

  return { captures, loading, error, addCapture, discardCapture, markConverted, refresh }
}
