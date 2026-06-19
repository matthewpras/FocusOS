"use client"

import { format } from "date-fns"
import { BookOpenText, CheckSquare, LoaderCircle, Trash2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useCaptures } from "@/hooks/useCaptures"
import { useObsidianSync } from "@/hooks/useObsidianSync"
import { useTasks } from "@/hooks/useTasks"

export default function CapturePage() {
  const { user, session } = useAuth()
  const captures = useCaptures(user?.id)
  const tasks = useTasks(user?.id)
  const obsidianEnabled = process.env.NEXT_PUBLIC_OBSIDIAN_ENABLED !== "false"
  const obsidian = useObsidianSync(session?.access_token, obsidianEnabled)

  async function convert(id: string, text: string) {
    await tasks.addTask({
      text,
      priority: "medium",
      category: "other",
      due_date: format(new Date(), "yyyy-MM-dd"),
    })
    await captures.markConverted(id)
  }

  return (
    <AppShell>
      <PageHeader title="Inbox" detail="Turn rough thoughts into work, or clear them away." />
      {obsidian.error ? (
        <section className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {obsidian.error}
        </section>
      ) : null}
      <div className="space-y-3">
        {captures.captures.map((capture) => (
          <section
            key={capture.id}
            className="flex flex-col gap-4 rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md sm:flex-row sm:items-center"
          >
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-white/75">
              {capture.text}
            </p>
            <div className="flex gap-2">
              {obsidian.enabled ? (
                <Button variant="secondary" className="gap-2" onClick={() => obsidian.syncCapture(capture.id)}>
                  {obsidian.running === "capture" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <BookOpenText className="size-4" />
                  )}
                  Obsidian
                </Button>
              ) : null}
              <Button className="gap-2" onClick={() => convert(capture.id, capture.text)}>
                <CheckSquare className="size-4" />
                Task
              </Button>
              <Button size="icon" variant="ghost" onClick={() => captures.discardCapture(capture.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </section>
        ))}
        {!captures.captures.length ? (
          <section className="rounded-lg border border-dashed border-white/[0.12] p-10 text-center text-sm text-white/45">
            Inbox empty. Use plus button or Cmd+N.
          </section>
        ) : null}
        {obsidian.lastSyncedPath ? (
          <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            Last Obsidian export: {obsidian.lastSyncedPath}
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
