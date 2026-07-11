"use client"

import { format } from "date-fns"
import { BookOpenText, CheckSquare, LoaderCircle, Sparkles, Trash2 } from "lucide-react"
import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { CaptureComposer } from "@/components/capture-composer"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { useCaptures } from "@/hooks/useCaptures"
import { useObsidianSync } from "@/hooks/useObsidianSync"
import { useTasks } from "@/hooks/useTasks"
import type { Category, Priority } from "@/types"

const priorities: Priority[] = ["low", "medium", "high"]
const categories: Category[] = ["work", "personal", "health", "other"]

type CaptureDraft = {
  priority: Priority
  category: Category
  dueDate: string
  obsidianTarget: string
}

function defaultDraft(): CaptureDraft {
  return {
    priority: "medium",
    category: "work",
    dueDate: format(new Date(), "yyyy-MM-dd"),
    obsidianTarget: "Inbox",
  }
}

export default function CapturePage() {
  const { user, session } = useAuth()
  const captures = useCaptures(user?.id)
  const tasks = useTasks(user?.id)
  const obsidianEnabled = process.env.NEXT_PUBLIC_OBSIDIAN_ENABLED !== "false"
  const obsidian = useObsidianSync(session?.access_token, obsidianEnabled)
  const [drafts, setDrafts] = useState<Record<string, CaptureDraft>>({})

  function draftFor(id: string) {
    return drafts[id] ?? defaultDraft()
  }

  function updateDraft(id: string, patch: Partial<CaptureDraft>) {
    setDrafts((items) => ({
      ...items,
      [id]: {
        ...(items[id] ?? defaultDraft()),
        ...patch,
      },
    }))
  }

  async function convert(id: string, text: string) {
    const draft = draftFor(id)
    await tasks.addTask({
      text,
      priority: draft.priority,
      category: draft.category,
      due_date: draft.dueDate || null,
    })
    await captures.markConverted(id)
    setDrafts((items) => {
      const next = { ...items }
      delete next[id]
      return next
    })
  }

  return (
    <AppShell>
      <PageHeader title="Hermes inbox" detail="Capture notes, screenshots, and links for Obsidian triage." />
      {obsidian.status ? (
        <section className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          <span className="font-medium text-white">Obsidian:</span> {obsidian.status.message}
        </section>
      ) : null}
      {obsidian.error ? (
        <section className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {obsidian.error}
        </section>
      ) : null}
      <section className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
          <Sparkles className="size-4 text-[var(--accent-blue)]" />
          Queue for Hermes
        </div>
        <CaptureComposer onSave={captures.addCapture} />
      </section>
      <div className="space-y-3">
        {captures.captures.map((capture) => {
          const draft = draftFor(capture.id)
          return (
            <section
              key={capture.id}
              className="grid gap-4 rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-white/75">
                  {capture.text}
                </p>
                {capture.obsidian_export_status ? (
                  <span className="w-fit rounded-md border border-white/[0.08] px-2 py-1 text-xs text-white/50">
                    Obsidian {capture.obsidian_export_status}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[130px_150px_150px_1fr_auto]">
                <Select
                  value={draft.priority}
                  onValueChange={(value) => updateDraft(capture.id, { priority: value as Priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={draft.category}
                  onValueChange={(value) => updateDraft(capture.id, { category: value as Category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={draft.dueDate}
                  onChange={(event) => updateDraft(capture.id, { dueDate: event.target.value })}
                  className="border-white/[0.08] bg-black/20"
                />

                <Input
                  value={draft.obsidianTarget}
                  onChange={(event) => updateDraft(capture.id, { obsidianTarget: event.target.value })}
                  placeholder="Obsidian folder"
                  className="border-white/[0.08] bg-black/20"
                />

                <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                  {obsidian.enabled ? (
                    <Button
                      variant="secondary"
                      className="min-w-0 flex-1 gap-2 lg:flex-none"
                      onClick={() => obsidian.syncCapture(capture.id, draft.obsidianTarget)}
                    >
                      {obsidian.running === "capture" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <BookOpenText className="size-4" />
                      )}
                      Export
                    </Button>
                  ) : null}
                  <Button
                    className="min-w-0 flex-1 gap-2 lg:flex-none"
                    onClick={() => convert(capture.id, capture.text)}
                  >
                    <CheckSquare className="size-4" />
                    Task
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Discard capture"
                    onClick={() => captures.discardCapture(capture.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {capture.obsidian_export_path ? (
                <p className="truncate text-xs text-white/40">
                  Last export: {capture.obsidian_export_path}
                </p>
              ) : null}
            </section>
          )
        })}
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
        {obsidian.lastMarkdown ? (
          <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-white">Markdown ready for Obsidian</p>
            <textarea
              readOnly
              value={obsidian.lastMarkdown}
              className="mt-3 min-h-32 w-full resize-y rounded-md border border-white/[0.08] bg-black/30 p-3 text-sm text-white/70"
            />
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
