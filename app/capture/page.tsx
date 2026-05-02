"use client"

import { format } from "date-fns"
import { CheckSquare, Trash2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useCaptures } from "@/hooks/useCaptures"
import { useTasks } from "@/hooks/useTasks"

export default function CapturePage() {
  const { user } = useAuth()
  const captures = useCaptures(user?.id)
  const tasks = useTasks(user?.id)

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
      <div className="space-y-3">
        {captures.captures.map((capture) => (
          <section key={capture.id} className="flex flex-col gap-4 rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-white/75">{capture.text}</p>
            <div className="flex gap-2">
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
      </div>
    </AppShell>
  )
}
