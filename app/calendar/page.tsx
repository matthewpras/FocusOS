"use client"

import { useState } from "react"
import { addWeeks, startOfWeek, subWeeks } from "date-fns"
import { CheckSquare, FileText, Mail, X } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { WeekCalendarGrid } from "@/components/calendar/week-calendar-grid"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useExternalCommitments } from "@/hooks/useExternalCommitments"
import { useTasks } from "@/hooks/useTasks"

export default function CalendarPage() {
  const { user } = useAuth()
  const commitments = useExternalCommitments(user?.id)
  const tasks = useTasks(user?.id)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))

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
        <WeekCalendarGrid
          weekStart={weekStart}
          events={commitments.upcomingEvents}
          onPrevWeek={() => setWeekStart((current) => subWeeks(current, 1))}
          onNextWeek={() => setWeekStart((current) => addWeeks(current, 1))}
          onToday={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
          onDismiss={commitments.dismiss}
        />

        <div className="flex flex-col gap-4">
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

          <div className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
            <div className="mb-4 flex items-center gap-2 text-[var(--today-muted)]">
              <FileText className="size-4" />
              <span className="text-xs uppercase tracking-[0.24em]">Drive activity</span>
            </div>
            <div className="space-y-3">
              {commitments.driveSignals.map((item) => {
                const webViewLink = typeof item.payload.webViewLink === "string" ? item.payload.webViewLink : null
                return (
                  <section key={item.id} className="rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      {webViewLink ? (
                        <a
                          href={webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 text-sm font-medium underline-offset-2 hover:underline"
                        >
                          {item.title}
                        </a>
                      ) : (
                        <p className="min-w-0 flex-1 text-sm font-medium">{item.title}</p>
                      )}
                      <Button size="icon" variant="ghost" aria-label="Dismiss file" className="size-11" onClick={() => commitments.dismiss(item.id)}>
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
                )
              })}
              {!commitments.driveSignals.length ? (
                <p className="text-sm text-[var(--today-muted)]">No recent Drive activity.</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
