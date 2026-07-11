"use client"

import { useCallback, useEffect, useState } from "react"

type SyncTarget = "capture" | "brief"
type ObsidianStatus = {
  mode: "local" | "fallback" | "disabled"
  enabled: boolean
  writable: boolean
  message: string
}

export function useObsidianSync(accessToken?: string, enabled = true) {
  const [running, setRunning] = useState<SyncTarget | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncedPath, setLastSyncedPath] = useState<string | null>(null)
  const [lastMarkdown, setLastMarkdown] = useState<string | null>(null)
  const [status, setStatus] = useState<ObsidianStatus | null>(null)

  const refreshStatus = useCallback(async () => {
    if (!enabled || !accessToken) {
      setStatus(null)
      return null
    }

    try {
      const response = await fetch("/api/obsidian/export", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const payload = (await response.json()) as {
        ok: boolean
        error?: string
        status?: ObsidianStatus
      }

      if (!response.ok || !payload.ok || !payload.status) {
        setError(payload.error ?? "Could not read Obsidian status.")
        return null
      }

      setStatus(payload.status)
      return payload.status
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Could not read Obsidian status.",
      )
      return null
    }
  }, [accessToken, enabled])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  async function sync(target: SyncTarget, captureId?: string, obsidianTarget?: string) {
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
    setLastMarkdown(null)

    try {
      const response = await fetch("/api/obsidian/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ target, captureId, obsidianTarget }),
      })

      const payload = (await response.json()) as {
        ok: boolean
        error?: string
        path?: string
        markdown?: string
      }

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Obsidian sync failed.")
        return null
      }

      setLastSyncedPath(payload.path ?? null)
      setLastMarkdown(payload.markdown ?? null)
      void refreshStatus()
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
    status,
    lastSyncedPath,
    lastMarkdown,
    refreshStatus,
    syncCapture: (captureId: string, obsidianTarget?: string) =>
      sync("capture", captureId, obsidianTarget),
    syncBrief: () => sync("brief"),
  }
}
