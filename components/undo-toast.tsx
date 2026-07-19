"use client"

import { useEffect, useState } from "react"
import { Undo2 } from "lucide-react"
import {
  UNDO_CLEARED_EVENT,
  UNDO_SCHEDULED_EVENT,
  undoPending,
  type UndoScheduledDetail,
} from "@/lib/undo-manager"

export function UndoToast() {
  const [pending, setPending] = useState<UndoScheduledDetail | null>(null)

  useEffect(() => {
    function onScheduled(event: Event) {
      setPending((event as CustomEvent<UndoScheduledDetail>).detail)
    }
    function onCleared(event: Event) {
      const { id } = (event as CustomEvent<{ id: string }>).detail
      setPending((current) => (current?.id === id ? null : current))
    }
    window.addEventListener(UNDO_SCHEDULED_EVENT, onScheduled)
    window.addEventListener(UNDO_CLEARED_EVENT, onCleared)
    return () => {
      window.removeEventListener(UNDO_SCHEDULED_EVENT, onScheduled)
      window.removeEventListener(UNDO_CLEARED_EVENT, onCleared)
    }
  }, [])

  if (!pending) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 mx-auto flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] px-4 py-3 text-sm text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.35)] lg:bottom-6 lg:left-[17rem] lg:mx-0"
    >
      <span className="truncate">Deleted {pending.label}</span>
      <button
        type="button"
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--today-line)] px-2 py-1 text-xs font-medium text-[var(--today-blue)] hover:bg-[var(--today-panel-muted)]"
        onClick={() => undoPending(pending.id)}
      >
        <Undo2 className="size-3.5" />
        Undo
      </button>
    </div>
  )
}
