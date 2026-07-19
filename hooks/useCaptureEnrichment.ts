"use client"

import { useState } from "react"

type EnrichResult = {
  ok: boolean
  processed: number
  exported: number
  failed: number
  errors: string[]
}

export function useCaptureEnrichment(accessToken?: string) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<EnrichResult | null>(null)

  async function run() {
    if (!accessToken) {
      setError("Sign in again before running the capture skill.")
      return null
    }

    setRunning(true)
    setError(null)

    try {
      const response = await fetch("/api/captures/enrich", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const payload = (await response.json()) as EnrichResult & { error?: string }

      if (!response.ok && response.status !== 207) {
        setError(payload.error ?? "Capture enrichment failed.")
        return null
      }

      setLastResult(payload)
      if (payload.errors?.length) setError(payload.errors[0])
      return payload
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Capture enrichment failed.")
      return null
    } finally {
      setRunning(false)
    }
  }

  return { running, error, lastResult, run }
}
