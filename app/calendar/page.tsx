"use client"

import { format } from "date-fns"
import { CalendarDays, CheckSquare, Mail, X } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useExternalCommitments } from "@/hooks/useExternalCommitments"
import { useTasks } from "@/hooks/useTasks"

function formatWhen(iso: string | null, dueDate: string | null) {
  if (iso) return format(new Date(iso), "EEEE, MMM d • h:mm a")
  if (dueDate) return `${dueDate} • all day`
  return "No date"
}

export default function CalendarPage() {
  const { user } = useAuth()
  const commitments = useExternalCommitments(user?.id)
  const tasks = useTasks(user?.id)

  async function createFollowUpTask(itemId: string, title: string) {
    await tasks.addTask({ text: title, priority: "medium", category: "other", due_date: null })
    await commitments.dismiss(itemId)
  }

  return (
    <AppShell>
      <PageHeader
        title="Calendar"
        detail="Upcoming events and assistant-surfaced follow-ups in one timeline."
      />
      {commitments.error ? (
        <ErrorBanner message={commitments.error} onRetry={commitments.refresh} />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
          <div className="mb-4 flex items-center gap-2 text-[var(--today-muted)]">
            <CalendarDays className="size-4" />
            <span className="text-xs uppercase tracking-[0.24em]">Upcoming schedule</span>
          </div>
          <div className="space-y-3">
            {commitments.upcomingEvents.map((event) => (
              <section key={event.id} className="rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{event.title}</p>
                    <p className="mt-1 text-sm text-[var(--today-muted)]">
                      {formatWhen(event.starts_at, event.due_date)}
                    </p>
                    {event.details ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--today-muted)]">{event.details}</p>
                    ) : null}
                  </div>
                  <Button size="icon" variant="ghost" aria-label="Dismiss event" className="size-11" onClick={() => commitments.dismiss(event.id)}>
                    <X className="size-4" />
                  </Button>
                </div>
              </section>
            ))}
            {!commitments.upcomingEvents.length ? (
              <p className="text-sm text-[var(--today-muted)]">No calendar events yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
          <div className="mb-4 flex items-center gap-2 text-[var(--today-muted)]">
            <Mail className="size-4" />
            <span className="text-xs uppercase tracking-[0.24em]">Inbox follow-ups</span>
          </div>
          <div className="space-y-3">
            {commitments.inboxSignals.map((item) => (
              <section key={item.id} className="rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium">{item.title}</p>
                  <Button size="icon" variant="ghost" aria-label="Dismiss follow-up" className="size-11" onClick={() => commitments.dismiss(item.id)}>
                    <X className="size-4" />
                  </Button>
                </div>
                {item.details ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--today-muted)]">{item.details}</p>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3 gap-2"
                  onClick={() => createFollowUpTask(item.id, item.title)}
                >
                  <CheckSquare className="size-4" />
                  Create follow-up task
                </Button>
              </section>
            ))}
            {!commitments.inboxSignals.length ? (
              <p className="text-sm text-[var(--today-muted)]">No Gmail follow-ups right now.</p>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
