"use client"

import { format, formatDistanceToNow } from "date-fns"
import { CalendarClock, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BentoTile } from "@/components/bento-tile"
import type { ExternalCommitment } from "@/types"

function formatEventTime(iso: string | null) {
  if (!iso) return "All day"

  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return "Time unavailable"

  return format(parsed, "EEE h:mm a")
}

function formatRelativeEventTime(iso: string | null) {
  if (!iso) return "Your next sync will fill this in."

  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return "Time unavailable"

  return `${formatEventTime(iso)} • ${formatDistanceToNow(parsed, { addSuffix: true })}`
}

export function CalendarAgendaCard({
  events,
  inboxSignals,
}: {
  events: ExternalCommitment[]
  inboxSignals: ExternalCommitment[]
}) {
  const nextEvent = events[0]
  const visibleEvents = events.slice(0, 4)

  return (
    <BentoTile title="Calendar pulse" eyebrow="Schedule" glow="violet">
      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/45">
            <CalendarClock className="size-4" />
            <p className="text-xs uppercase tracking-[0.24em]">Next event</p>
          </div>
          <p className="mt-3 text-base font-semibold text-white">
            {nextEvent?.title ?? "No upcoming calendar events"}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {formatRelativeEventTime(nextEvent?.starts_at ?? null)}
          </p>
        </div>

        <div className="space-y-2">
          {visibleEvents.length ? (
            visibleEvents.map((event) => (
              <div key={event.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{event.title}</p>
                    <p className="text-xs text-white/45">{formatEventTime(event.starts_at)}</p>
                  </div>
                  {event.action_hint ? (
                    <Badge className="bg-white/[0.08] text-white/70">{event.action_hint}</Badge>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/40">No upcoming events loaded yet.</p>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white/45">
            <Mail className="size-4" />
            <p className="text-xs uppercase tracking-[0.24em]">Inbox signals</p>
          </div>
          <p className="mt-3 text-sm text-white/75">
            {inboxSignals.length
              ? `${inboxSignals.length} email follow-ups surfaced by the assistant.`
              : "No Gmail follow-ups surfaced right now."}
          </p>
        </div>
      </div>
    </BentoTile>
  )
}