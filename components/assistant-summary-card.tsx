"use client"

import { formatDistanceToNow } from "date-fns"
import { Bot, CalendarClock, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AssistantBrief, AssistantRun, AssistantSourceState } from "@/types"

function toneForStatus(status: string | undefined) {
  if (status === "failed") return "bg-red-500/12 text-red-200 border-red-500/20"
  if (status === "partial_failure") return "bg-amber-500/12 text-amber-100 border-amber-500/20"
  if (status === "success") return "bg-emerald-500/12 text-emerald-100 border-emerald-500/20"
  return "bg-white/[0.07] text-white/70 border-white/[0.08]"
}

export function AssistantSummaryCard({
  brief,
  latestRun,
  sourceState,
  loading,
  running,
  error,
  onRunNow,
}: {
  brief: AssistantBrief | null
  latestRun: AssistantRun | null
  sourceState: AssistantSourceState | null
  loading: boolean
  running: boolean
  error: string | null
  onRunNow: () => void
}) {
  const status = latestRun?.status ?? sourceState?.status ?? "idle"
  const lastRunAt = latestRun?.started_at ?? sourceState?.last_attempted_run_at
  const lastRunLabel = lastRunAt
    ? formatDistanceToNow(new Date(lastRunAt), { addSuffix: true })
    : "No assistant runs yet"

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] p-5 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_100%_0%,rgba(168,85,247,0.16),transparent_24%)]" />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/55">
              <Bot className="size-4" />
              <span className="text-xs uppercase tracking-[0.28em]">Assistant automation</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Daily plan and source sync</h2>
              <p className="mt-1 max-w-3xl text-sm text-white/60">
                {brief?.summary ??
                  "Assistant ready for 6 AM launch and 4-hour refresh cadence across calendar, Gmail, tasks, habits, and inbox."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={toneForStatus(status)}>{status.replace("_", " ")}</Badge>
            <Button
              variant="secondary"
              className="gap-2"
              disabled={running || loading}
              onClick={onRunNow}
            >
              {running ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Run now
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Top priorities</p>
            <div className="mt-3 space-y-2">
              {(brief?.top_priorities?.length ? brief.top_priorities : ["Assistant will rank priorities after first sync."]).map(
                (item, index) => (
                  <div key={`${item}-${index}`} className="flex gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-white/80">
                    <span className="text-white/35">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Focus block</p>
            <p className="mt-3 text-xl font-semibold text-white">
              {brief?.first_focus_block ?? "Waiting for first planning run"}
            </p>
            <p className="mt-2 text-sm text-white/55">
              {brief?.focus_note ?? "6 AM run will protect first deep-work window."}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <div className="flex items-center gap-2 text-white/45">
              <CalendarClock className="size-4" />
              <p className="text-xs uppercase tracking-[0.24em]">Automation status</p>
            </div>
            <p className="mt-3 text-sm text-white/75">Last run {lastRunLabel}</p>
            <p className="mt-2 text-sm text-white/55">
              Next window: 6 AM, 10 AM, 2 PM, 6 PM, 10 PM Eastern.
            </p>
            {sourceState?.error_text || error ? (
              <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error ?? sourceState?.error_text}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Next actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(brief?.next_actions?.length ? brief.next_actions : ["First run will publish next actions here."]).map(
                (item, index) => (
                  <Badge key={`${item}-${index}`} className="bg-white/[0.08] text-white/75">
                    {item}
                  </Badge>
                ),
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Risks and conflicts</p>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              {(brief?.risks?.length ? brief.risks : ["No active risks tracked yet."]).map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
