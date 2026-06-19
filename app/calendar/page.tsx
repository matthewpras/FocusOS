"use client"

import { format } from "date-fns"
import { CalendarDays, Mail } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { useExternalCommitments } from "@/hooks/useExternalCommitments"

function formatWhen(iso: string | null, dueDate: string | null) {
  if (iso) return format(new Date(iso), "EEEE, MMM d • h:mm a")
  if (dueDate) return `${dueDate} • all day`
  return "No date"
}

export default function CalendarPage() {
  const { user } = useAuth()
  const commitments = useExternalCommitments(user?.id)

  return (
    <AppShell>
      <PageHeader
        title="Calendar"
        detail="Upcoming events and assistant-surfaced follow-ups in one timeline."
      />

      <section className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2 text-white/55">
            <CalendarDays className="size-4" />
            <span className="text-xs uppercase tracking-[0.24em]">Upcoming schedule</span>
          </div>
          <div className="space-y-3">
            {commitments.upcomingEvents.map((event) => (
              <section key={event.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{event.title}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {formatWhen(event.starts_at, event.due_date)}
                    </p>
                    {event.details ? (
                      <p className="mt-2 text-sm leading-6 text-white/70">{event.details}</p>
                    ) : null}
                  </div>
                  {event.action_hint ? (
                    <Badge className="bg-white/[0.08] text-white/70">{event.action_hint}</Badge>
                  ) : null}
                </div>
              </section>
            ))}
            {!commitments.upcomingEvents.length ? (
              <p className="text-sm text-white/45">No calendar events synced yet.</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2 text-white/55">
            <Mail className="size-4" />
            <span className="text-xs uppercase tracking-[0.24em]">Inbox follow-ups</span>
          </div>
          <div className="space-y-3">
            {commitments.inboxSignals.map((item) => (
              <section key={item.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <p className="text-sm font-medium text-white">{item.title}</p>
                {item.details ? (
                  <p className="mt-2 text-sm leading-6 text-white/65">{item.details}</p>
                ) : null}
                {item.action_hint ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/40">
                    {item.action_hint}
                  </p>
                ) : null}
              </section>
            ))}
            {!commitments.inboxSignals.length ? (
              <p className="text-sm text-white/45">No Gmail follow-ups surfaced right now.</p>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  )
}
