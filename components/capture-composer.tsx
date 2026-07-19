"use client"

import { ImagePlus, Link2, Send, X } from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { detectLinkKind, extractCaptureLinks } from "@/lib/capture-payload"
import type { CaptureLink, CaptureMediaItem, RichCaptureInput } from "@/types"

type CaptureComposerProps = {
  onSave: (input: RichCaptureInput) => Promise<void> | void
  onCancel?: () => void
  autoFocus?: boolean
  compact?: boolean
  submitLabel?: string
}

const maxImageBytes = 5 * 1024 * 1024

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(String(reader.result)))
    reader.addEventListener("error", () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function CaptureComposer({
  onSave,
  onCancel,
  autoFocus,
  compact,
  submitLabel = "Queue for Hermes",
}: CaptureComposerProps) {
  const [note, setNote] = useState("")
  const [linkInput, setLinkInput] = useState("")
  const [links, setLinks] = useState<CaptureLink[]>([])
  const [mediaItems, setMediaItems] = useState<CaptureMediaItem[]>([])
  const [obsidianTarget, setObsidianTarget] = useState("Inbox")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addLink() {
    const url = normalizeUrl(linkInput)
    if (!url) return

    try {
      const nextLink = { url, kind: detectLinkKind(url) }
      setLinks((items) =>
        items.some((item) => item.url === nextLink.url) ? items : [...items, nextLink],
      )
      setLinkInput("")
      setError(null)
    } catch {
      setError("Enter a valid URL.")
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)

    const nextItems: CaptureMediaItem[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setError("Images only for this capture lane.")
        continue
      }
      if (file.size > maxImageBytes) {
        setError(`${file.name} is over 5 MB.`)
        continue
      }

      nextItems.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data_url: await readFileAsDataUrl(file),
      })
    }

    if (nextItems.length) {
      setMediaItems((items) => [...items, ...nextItems].slice(0, 6))
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function save() {
    const detectedLinks = extractCaptureLinks([note])
    const mergedLinks = [...links]

    for (const link of detectedLinks) {
      if (!mergedLinks.some((item) => item.url === link.url)) mergedLinks.push(link)
    }

    if (!note.trim() && !mergedLinks.length && !mediaItems.length) return

    setSaving(true)
    setError(null)

    try {
      await onSave({
        note,
        links: mergedLinks,
        mediaItems,
        obsidianTarget,
      })
      setNote("")
      setLinks([])
      setMediaItems([])
      setObsidianTarget("Inbox")
      onCancel?.()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Capture failed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <Textarea
        aria-label="Capture note"
        autoFocus={autoFocus}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            void save()
          }
        }}
        placeholder="Note, task, link context, or screenshot context..."
        className={compact ? "min-h-32 resize-none border-[var(--today-line)] bg-[var(--today-panel)]" : "min-h-40 resize-y border-[var(--today-line)] bg-[var(--today-panel)]"}
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          aria-label="Reference link URL"
          value={linkInput}
          onChange={(event) => setLinkInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addLink()
            }
          }}
          placeholder="TikTok, YouTube, or reference URL"
          className="border-[var(--today-line)] bg-[var(--today-panel)]"
        />
        <Button type="button" variant="secondary" className="gap-2" onClick={addLink}>
          <Link2 className="size-4" />
          Add link
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <span
            key={link.url}
            className="inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--today-line)] bg-[var(--today-panel)] px-2 py-1 text-xs text-[var(--today-muted)]"
          >
            <span className="shrink-0 text-[var(--today-muted)]">{link.kind}</span>
            <span className="truncate">{link.url}</span>
            <button
              type="button"
              aria-label="Remove link"
              className="-m-1 p-1"
              onClick={() => setLinks((items) => items.filter((item) => item.url !== link.url))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      {mediaItems.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {mediaItems.map((item) => (
            <div
              key={`${item.name}-${item.size}`}
              className="relative overflow-hidden rounded-lg border border-[var(--today-line)] bg-[var(--today-panel-muted)]"
            >
              {item.data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.data_url} alt={item.name} className="aspect-video w-full object-cover" />
              ) : null}
              <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-[var(--today-muted)]">
                <span className="truncate">{item.name}</span>
                <button
                  type="button"
                  aria-label="Remove image"
                  className="-m-1 p-1"
                  onClick={() =>
                    setMediaItems((items) =>
                      items.filter((candidate) => candidate !== item),
                    )
                  }
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          aria-label="Obsidian folder"
          value={obsidianTarget}
          onChange={(event) => setObsidianTarget(event.target.value)}
          placeholder="Obsidian folder"
          className="border-[var(--today-line)] bg-[var(--today-panel)]"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(event) => void addFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Images
        </Button>
        <Button type="button" className="gap-2" disabled={saving} onClick={() => void save()}>
          <Send className="size-4" />
          {saving ? "Saving" : submitLabel}
        </Button>
      </div>

      {error ? <p role="alert" className="text-sm text-amber-200">{error}</p> : null}

      {onCancel ? (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  )
}
