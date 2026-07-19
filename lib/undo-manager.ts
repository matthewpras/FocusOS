const DELAY_MS = 6000

type PendingAction = {
  id: string
  label: string
  timer: ReturnType<typeof setTimeout>
  commit: () => void | Promise<void>
  onUndo?: () => void
}

const pending = new Map<string, PendingAction>()

export const UNDO_SCHEDULED_EVENT = "focusos:undo-scheduled"
export const UNDO_CLEARED_EVENT = "focusos:undo-cleared"

export type UndoScheduledDetail = { id: string; label: string }

function notifyScheduled(detail: UndoScheduledDetail) {
  window.dispatchEvent(new CustomEvent<UndoScheduledDetail>(UNDO_SCHEDULED_EVENT, { detail }))
}

function notifyCleared(id: string) {
  window.dispatchEvent(new CustomEvent<{ id: string }>(UNDO_CLEARED_EVENT, { detail: { id } }))
}

export function scheduleUndo(
  id: string,
  label: string,
  commit: () => void | Promise<void>,
  onUndo?: () => void,
) {
  const existing = pending.get(id)
  if (existing) clearTimeout(existing.timer)

  const timer = setTimeout(() => {
    const action = pending.get(id)
    pending.delete(id)
    notifyCleared(id)
    void action?.commit()
  }, DELAY_MS)

  pending.set(id, { id, label, timer, commit, onUndo })
  notifyScheduled({ id, label })
}

export function undoPending(id: string) {
  const action = pending.get(id)
  if (!action) return false
  clearTimeout(action.timer)
  pending.delete(id)
  notifyCleared(id)
  action.onUndo?.()
  return true
}
