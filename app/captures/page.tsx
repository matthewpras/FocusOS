"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { Search, Trash2, X } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import type { Capture, CaptureIntake } from "@/types"

type ArchiveCapture = Capture & { title: string | null; summary: string | null }

export default function CapturesPage() {
  const { user } = useAuth()
  const [captures, setCaptures] = useState<ArchiveCapture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from("captures")
      .select("*, capture_intake(title,summary)")
      .order("created_at", { ascending: false })
      .limit(500)
    if (fetchError) {
      setError("Couldn't load captures.")
    } else {
      setError(null)
      type IntakeFields = Pick<CaptureIntake, "title" | "summary">
      type Row = Capture & { capture_intake: IntakeFields[] | IntakeFields | null }
      const rows = (data ?? []) as Row[]
      setCaptures(
        rows.map((row) => {
          const { capture_intake, ...capture } = row
          const intake = Array.isArray(capture_intake) ? capture_intake[0] : capture_intake
          return { ...capture, title: intake?.title ?? null, summary: intake?.summary ?? null }
        }),
      )
    }
    setLoading(false)
  }, [supabase, user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    if (!query) return captures
    const needle = query.toLowerCase()
    return captures.filter(
      (capture) =>
        capture.text.toLowerCase().includes(needle) ||
        capture.title?.toLowerCase().includes(needle) ||
        capture.summary?.toLowerCase().includes(needle),
    )
  }, [captures, query])

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function deleteSelected() {
    if (!supabase || !selected.size) return
    const ids = Array.from(selected)
    if (!window.confirm(`Delete ${ids.length} capture${ids.length === 1 ? "" : "s"}? This can't be undone.`)) return
    setCaptures((items) => items.filter((item) => !selected.has(item.id)))
    setSelected(new Set())
    await supabase.from("captures").delete().in("id", ids)
  }

  return (
    <AppShell>
      <PageHeader
        title="Captures"
        detail="Full history of everything captured, converted or not. The searchable archive behind Inbox."
      />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--today-muted)]" />
          <Input
            aria-label="Search captures"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search captures"
            className="border-[var(--today-line)] bg-[var(--today-panel)] pl-9"
          />
        </div>
      </section>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--today-ink)]">{selected.size} selected</span>
          <Button size="sm" variant="ghost" className="gap-1.5 text-red-200 hover:text-red-100" onClick={deleteSelected}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={() => setSelected(new Set())}>
            <X className="size-3.5" />
            Clear
          </Button>
        </div>
      ) : null}

      <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
        <div className="space-y-2">
          {filtered.map((capture) => (
            <div key={capture.id} className="flex items-start gap-2">
              <label className="-m-2 mt-1 flex items-center justify-center p-2">
                <input
                  type="checkbox"
                  aria-label={`Select capture "${capture.text.slice(0, 40)}"`}
                  checked={selected.has(capture.id)}
                  onChange={() => toggleSelected(capture.id)}
                  className="size-4 accent-[var(--today-blue)]"
                />
              </label>
              <div className="min-w-0 flex-1 rounded-md bg-[var(--today-panel)] p-3 text-[var(--today-ink)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {capture.title ? (
                      <p className="text-sm font-medium">{capture.title}</p>
                    ) : null}
                    <p className="min-w-0 whitespace-pre-wrap text-sm text-[var(--today-muted)]">
                      {capture.summary ?? capture.text}
                    </p>
                  </div>
                  <span
                    className={
                      capture.converted
                        ? "shrink-0 rounded-full bg-[var(--today-panel-muted)] px-2 py-0.5 text-[11px] text-[var(--today-muted)]"
                        : "shrink-0 rounded-full bg-[var(--today-blue)]/20 px-2 py-0.5 text-[11px] text-[oklch(0.82_0.1_245)]"
                    }
                  >
                    {capture.converted ? "converted" : "in inbox"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--today-muted)]">
                  {format(new Date(capture.created_at), "MMM d, yyyy • h:mm a")}
                </p>
              </div>
            </div>
          ))}
          {!loading && !filtered.length ? (
            <p className="py-2 text-sm text-[var(--today-muted)]">
              {query ? "No captures match." : "Nothing captured yet."}
            </p>
          ) : null}
        </div>
      </section>
    </AppShell>
  )
}
