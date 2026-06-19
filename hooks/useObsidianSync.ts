"use client"

import { useState } from "react"

type SyncTarget = "capture" | "brief"

export function useObsidianSync(accessToken?: string, enabled = true) {
  const [running, setRunning] = useState<SyncTarget | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedPath, setLastSyncedPath] = useState<string | null>(null)

  async function sync(target: SyncTarget, captureId?: string) {
    if (!enabled) {
      setError("Obsidian export is disabled in this environment.")
      return null
    }

    if (!accessToken) {
      setError("Sign in again before syncing to Obsidian.")
      return null
    }

    setRunning(target)
    setError(null)

    try {
      const response = await fetch("/api/obsidian/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ target, captureId }),
      })

      const payload = (await response.json()) as {
        ok: boolean
        error?: string
        path?: string
      }

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Obsidian sync failed.")
        return null
      }

      setLastSyncedPath(payload.path ?? null)
      return payload.path ?? null
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Obsidian sync failed.")
      return null
    } finally {
      setRunning(null)
    }
  }

  return {
    enabled,
    running,
    error,
    lastSyncedPath,
    syncCapture: (captureId: string) => sync("capture", captureId),
    syncBrief: () => sync("brief"),
  }
}