"use client"

import { format } from "date-fns"
import { BookOpenText, CheckSquare, LoaderCircle, Sparkles, Trash2, Wand2 } from "lucide-react"
import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { CaptureComposer } from "@/components/capture-composer"
import { ErrorBanner } from "@/components/error-banner"
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
import { useCaptureEnrichment } from "@/hooks/useCaptureEnrichment"
import { useCaptures } from "@/hooks/useCaptures"
import { useObsidianSync } from "@/hooks/useObsidianSync"
import { useTasks } from "@/hooks/useTasks"
import { OBSIDIAN_CUSTOM_FOLDER_VALUE, OBSIDIAN_FOLDER_OPTIONS } from "@/lib/obsidian-folders"
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
  const enrichment = useCaptureEnrichment(session?.access_token)
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

  const queue = captures.captures.filter((capture) => capture.agentStatus !== "synced")
  const completed = captures.captures.filter((capture) => capture.agentStatus === "synced")

  function renderCaptureCard(capture: (typeof captures.captures)[number]) {
    const draft = draftFor(capture.id)
    return (
      <section
        key={capture.id}
        className="grid gap-4 rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {capture.title ? (
              <p className="text-sm font-medium leading-6 text-[var(--today-ink)]">{capture.title}</p>
            ) : null}
            <p className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-[var(--today-muted)]">
              {capture.summary ?? capture.text}
            </p>
            {capture.keyTakeaways.length ? (
              <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-[var(--today-muted)]">
                {capture.keyTakeaways.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : null}
            {capture.whatThisMeansForMe ? (
              <p className="text-xs italic leading-5 text-[var(--today-muted)]">
                {capture.whatThisMeansForMe}
              </p>
            ) : null}
            {capture.tags.length ? (
              <div className="flex flex-wrap gap-1.5">
                {capture.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--today-panel-muted)] px-2 py-0.5 text-[11px] text-[var(--today-muted)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {capture.agentStatus ? (
              <span className="w-fit rounded-md border border-[var(--today-line)] px-2 py-1 text-xs text-[var(--today-muted)]">
                Skill {capture.agentStatus}
              </span>
            ) : null}
            {capture.obsidian_export_status ? (
              <span className="w-fit rounded-md border border-[var(--today-line)] px-2 py-1 text-xs text-[var(--today-muted)]">
                Obsidian {capture.obsidian_export_status}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[130px_150px_150px_1fr_auto]">
          <Select
            value={draft.priority}
            onValueChange={(value) => updateDraft(capture.id, { priority: value as Priority })}
          >
            <SelectTrigger aria-label="Priority">
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
            <SelectTrigger aria-label="Category">
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
            aria-label="Due date"
            type="date"
            value={draft.dueDate}
            onChange={(event) => updateDraft(capture.id, { dueDate: event.target.value })}
            className="border-[var(--today-line)] bg-[var(--today-panel)]"
          />

          <div className="flex gap-2">
            <Select
              value={
                (OBSIDIAN_FOLDER_OPTIONS as readonly string[]).includes(draft.obsidianTarget)
                  ? draft.obsidianTarget
                  : OBSIDIAN_CUSTOM_FOLDER_VALUE
              }
              onValueChange={(value) =>
                updateDraft(capture.id, {
                  obsidianTarget: !value || value === OBSIDIAN_CUSTOM_FOLDER_VALUE ? "" : value,
                })
              }
            >
              <SelectTrigger aria-label="Obsidian folder" className="border-[var(--today-line)] bg-[var(--today-panel)]">
                <SelectValue placeholder="Obsidian folder" />
              </SelectTrigger>
              <SelectContent>
                {OBSIDIAN_FOLDER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                <SelectItem value={OBSIDIAN_CUSTOM_FOLDER_VALUE}>Custom...</SelectItem>
              </SelectContent>
            </Select>
            {!(OBSIDIAN_FOLDER_OPTIONS as readonly string[]).includes(draft.obsidianTarget) ? (
              <Input
                aria-label="Custom Obsidian folder"
                value={draft.obsidianTarget}
                onChange={(event) => updateDraft(capture.id, { obsidianTarget: event.target.value })}
                placeholder="Folder name"
                className="border-[var(--today-line)] bg-[var(--today-panel)]"
              />
            ) : null}
          </div>

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
              className="size-11"
              onClick={() => captures.discardCapture(capture.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        {capture.obsidian_export_path ? (
          <p className="truncate text-xs text-[var(--today-muted)]">
            Last export: {capture.obsidian_export_path}
          </p>
        ) : null}
      </section>
    )
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
      {captures.error ? <ErrorBanner message={captures.error} onRetry={captures.refresh} /> : null}
      <section className="flex flex-col gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] px-4 py-3 text-sm text-[var(--today-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="font-medium text-[var(--today-ink)]">Obsidian:</span>{" "}
          {obsidian.status?.message ?? "Checking status..."}
        </span>
        <Button
          type="button"
          variant="secondary"
          className="w-fit gap-2"
          disabled={enrichment.running}
          onClick={() => void enrichment.run()}
        >
          {enrichment.running ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Wand2 className="size-4" />
          )}
          Run capture skill
        </Button>
      </section>
      {enrichment.lastResult ? (
        <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] px-4 py-3 text-sm text-[var(--today-muted)]">
          Enriched {enrichment.lastResult.processed}, exported {enrichment.lastResult.exported}
          {enrichment.lastResult.failed ? `, ${enrichment.lastResult.failed} failed` : ""}.
        </section>
      ) : null}
      {enrichment.error ? (
        <section role="alert" className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {enrichment.error}
        </section>
      ) : null}
      {obsidian.error ? (
        <section role="alert" className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {obsidian.error}
        </section>
      ) : null}
      <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-[var(--today-blue)]" />
          Queue for Hermes
        </div>
        <CaptureComposer onSave={captures.addCapture} />
      </section>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--today-ink)]">
          Queue
          <span className="text-xs font-normal text-[var(--today-muted)]">({queue.length})</span>
        </div>
        {queue.map((capture) => renderCaptureCard(capture))}
        {!queue.length ? (
          <section className="rounded-lg border border-dashed border-[var(--today-line)] p-10 text-center text-sm text-[var(--today-muted)]">
            Inbox is empty. Use the plus button or Cmd+N.
          </section>
        ) : null}

        {completed.length ? (
          <>
            <div className="pt-2 flex items-center gap-2 text-sm font-medium text-[var(--today-ink)]">
              Completed
              <span className="text-xs font-normal text-[var(--today-muted)]">({completed.length})</span>
            </div>
            {completed.map((capture) => renderCaptureCard(capture))}
          </>
        ) : null}

        {obsidian.lastSyncedPath ? (
          <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] px-4 py-3 text-sm text-[var(--today-muted)]">
            Last Obsidian export: {obsidian.lastSyncedPath}
          </section>
        ) : null}
        {obsidian.lastMarkdown ? (
          <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)]">
            <p className="text-sm font-medium">Markdown ready for Obsidian</p>
            <textarea
              readOnly
              value={obsidian.lastMarkdown}
              className="mt-3 min-h-32 w-full resize-y rounded-md border border-[var(--today-line)] bg-[var(--today-panel-muted)] p-3 text-sm text-[var(--today-muted)]"
            />
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
