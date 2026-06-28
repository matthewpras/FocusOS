"use client"

import { Activity, Bot, CheckCircle2, Clock, ShieldCheck, TriangleAlert } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { useAssistant } from "@/hooks/useAssistant"
import { useAuth } from "@/hooks/use-auth"
import { getAssistantFreshness } from "@/lib/today-home"

function formatValue(value: string | null | undefined) {
  if (!value) return "Not recorded"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)
}

export default function OperationsPage() {
  const { user, session } = useAuth()
  const assistant = useAssistant(user?.id, session?.access_token)
  const freshness = getAssistantFreshness(assistant.sourceState)
  const failed = freshness.state === "failed"
  const stale = freshness.state === "stale" || freshness.state === "unknown"

  return (
    <AppShell>
      <PageHeader
        title="Operations"
        detail="Audit trail, sync health, and Hermes system activity."
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white/65">
              <Activity className="size-4" />
              <h2 className="text-sm font-semibold text-white">Hermes activity</h2>
            </div>
            <Badge className="border-white/[0.08] bg-white/[0.06] text-white/70">
              Read-only
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <div className="flex items-center gap-2 text-white/55">
                <Bot className="size-4" />
                <p className="text-xs font-medium uppercase tracking-[0.18em]">Status</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">{freshness.label}</p>
              <p className="mt-1 text-sm leading-6 text-white/58">{freshness.detail}</p>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-black/20 p-4">
              <div className="flex items-center gap-2 text-white/55">
                {failed ? (
                  <TriangleAlert className="size-4 text-red-300" />
                ) : stale ? (
                  <Clock className="size-4 text-amber-200" />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-200" />
                )}
                <p className="text-xs font-medium uppercase tracking-[0.18em]">
                  Latest run
                </p>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Attempted</dt>
                  <dd className="text-right text-white/78">
                    {formatValue(assistant.sourceState?.last_attempted_run_at)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Successful</dt>
                  <dd className="text-right text-white/78">
                    {formatValue(assistant.sourceState?.last_successful_run_at)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/45">Next window</dt>
                  <dd className="text-right text-white/78">
                    {formatValue(assistant.sourceState?.next_suggested_run_at)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {assistant.error || assistant.sourceState?.error_text ? (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              {assistant.error ?? assistant.sourceState?.error_text}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-white/60">
              <ShieldCheck className="size-4" />
              <h2 className="text-sm font-semibold text-white">Safety contract</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/58">
              <li>Browser uses normal Supabase auth and RLS.</li>
              <li>Hermes secrets stay local, never browser-visible.</li>
              <li>Audit rows are append-only operational evidence.</li>
              <li>Destructive admin writes require audit events.</li>
            </ul>
          </section>

          <section className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
            <h2 className="text-sm font-semibold text-white">Next Hermes surface</h2>
            <p className="mt-2 text-sm leading-6 text-white/58">
              Board recommendations, agent events, failed writes, and provenance
              watch belong here next.
            </p>
          </section>
        </aside>
      </section>
    </AppShell>
  )
}
