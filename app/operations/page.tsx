"use client"

import { formatDistanceToNow } from "date-fns"
import { Activity, Bot, CheckCircle2, Clock, ShieldCheck, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAgentEvents } from "@/hooks/useAgentEvents"
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

function eventTone(status: string) {
  if (status === "failed") return { icon: TriangleAlert, className: "text-red-300" }
  if (status === "warning") return { icon: Clock, className: "text-amber-200" }
  return { icon: CheckCircle2, className: "text-emerald-200" }
}

export default function OperationsPage() {
  const { user, session } = useAuth()
  const assistant = useAssistant(user?.id, session?.access_token)
  const agentEvents = useAgentEvents(user?.id)
  const freshness = getAssistantFreshness(assistant.sourceState)
  const failed = freshness.state === "failed"
  const stale = freshness.state === "stale" || freshness.state === "unknown"

  return (
    <AppShell>
      <PageHeader
        title="Operations"
        detail="Audit trail, sync health, and Hermes system activity."
      />
      {agentEvents.error ? (
        <ErrorBanner message={agentEvents.error} onRetry={agentEvents.refresh} />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-5 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[var(--today-muted)]">
                <Activity className="size-4" />
                <h2 className="text-sm font-semibold text-[var(--today-ink)]">Hermes activity</h2>
              </div>
              <Badge className="border-[var(--today-line)] bg-[var(--today-panel-muted)] text-[var(--today-muted)]">
                Read-only
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] p-4">
                <div className="flex items-center gap-2 text-[var(--today-muted)]">
                  <Bot className="size-4" />
                  <p className="text-xs font-medium uppercase tracking-[0.18em]">Status</p>
                </div>
                <p className="mt-3 text-lg font-semibold text-[var(--today-ink)]">{freshness.label}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--today-muted)]">{freshness.detail}</p>
              </div>

              <div className="rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] p-4">
                <div className="flex items-center gap-2 text-[var(--today-muted)]">
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
                    <dt className="text-[var(--today-muted)]">Attempted</dt>
                    <dd className="text-right text-[var(--today-ink)]">
                      {formatValue(assistant.sourceState?.last_attempted_run_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--today-muted)]">Successful</dt>
                    <dd className="text-right text-[var(--today-ink)]">
                      {formatValue(assistant.sourceState?.last_successful_run_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--today-muted)]">Next window</dt>
                    <dd className="text-right text-[var(--today-ink)]">
                      {formatValue(assistant.sourceState?.next_suggested_run_at)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {assistant.error || assistant.sourceState?.error_text ? (
              <div role="alert" className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {assistant.error ?? assistant.sourceState?.error_text}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-5 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
            <h2 className="text-sm font-semibold">Recent agent events</h2>
            <p className="mt-1 text-xs text-[var(--today-muted)]">
              Append-only log of what Hermes and other agents actually did.
            </p>
            {agentEvents.events.length ? (
              <ul className="mt-4 space-y-3">
                {agentEvents.events.map((event) => {
                  const tone = eventTone(event.status)
                  const Icon = tone.icon
                  return (
                    <li key={event.id} className="flex items-start gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] p-3">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${tone.className}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{event.agent_name}</span>
                          <span className="text-xs text-[var(--today-muted)]">{event.action}</span>
                          {event.target_table ? (
                            <span className="text-xs text-[var(--today-muted)]">on {event.target_table}</span>
                          ) : null}
                        </div>
                        {event.summary ? (
                          <p className="mt-1 text-sm text-[var(--today-muted)]">{event.summary}</p>
                        ) : null}
                        {event.error_text ? (
                          <p className="mt-1 text-sm text-red-200">{event.error_text}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs text-[var(--today-muted)]">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--today-muted)]">
                No agent events recorded yet. This log fills in as Hermes runs.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
            <div className="flex items-center gap-2 text-[var(--today-muted)]">
              <ShieldCheck className="size-4" />
              <h2 className="text-sm font-semibold text-[var(--today-ink)]">Safety contract</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--today-muted)]">
              <li>Browser uses normal Supabase auth and RLS.</li>
              <li>Hermes secrets stay local, never browser-visible.</li>
              <li>Audit rows are append-only operational evidence.</li>
              <li>Destructive admin writes require audit events.</li>
            </ul>
          </section>

          <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
            <h2 className="text-sm font-semibold text-[var(--today-ink)]">Board recommendations</h2>
            {agentEvents.recommendations.length ? (
              <ul className="mt-3 space-y-3">
                {agentEvents.recommendations.map((rec) => (
                  <li key={rec.id} className="rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{rec.title}</span>
                      <Badge className="border-[var(--today-line)] bg-[var(--today-panel-muted)] text-[var(--today-muted)]">
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--today-muted)]">{rec.summary}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        onClick={() => agentEvents.setRecommendationStatus(rec.id, "accepted")}
                      >
                        <ThumbsUp className="size-3.5" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5"
                        onClick={() => agentEvents.setRecommendationStatus(rec.id, "dismissed")}
                      >
                        <ThumbsDown className="size-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[var(--today-muted)]">
                No active recommendations from the board right now.
              </p>
            )}
          </section>
        </aside>
      </section>
    </AppShell>
  )
}
