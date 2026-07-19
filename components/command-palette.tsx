"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  Archive,
  Bot,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Flame,
  FolderKanban,
  Home,
  Inbox,
  Layers,
  Plus,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OPEN_ASSISTANT_CHAT_EVENT } from "@/components/assistant-chat-panel"

export const OPEN_COMMAND_PALETTE_EVENT = "focusos:open-command-palette"

type PaletteItem = {
  id: string
  label: string
  hint?: string
  icon: typeof Home
  run: (router: ReturnType<typeof useRouter>) => void
}

const items: PaletteItem[] = [
  { id: "today", label: "Today", icon: Home, run: (router) => router.push("/") },
  {
    id: "capture",
    label: "Quick capture",
    hint: "Cmd+N",
    icon: Plus,
    run: () => window.dispatchEvent(new Event("focusos:open-capture")),
  },
  {
    id: "chat",
    label: "Chat with Hermes",
    icon: Bot,
    run: () => window.dispatchEvent(new Event(OPEN_ASSISTANT_CHAT_EVENT)),
  },
  { id: "inbox", label: "Inbox", icon: Inbox, run: (router) => router.push("/capture") },
  { id: "tasks", label: "Tasks", icon: CheckSquare, run: (router) => router.push("/tasks") },
  { id: "upcoming", label: "Upcoming", icon: CalendarDays, run: (router) => router.push("/upcoming") },
  { id: "anytime", label: "Anytime", icon: CheckCircle2, run: (router) => router.push("/anytime") },
  { id: "someday", label: "Someday", icon: Archive, run: (router) => router.push("/someday") },
  { id: "logbook", label: "Logbook", icon: BookOpen, run: (router) => router.push("/logbook") },
  { id: "habits", label: "Habits", icon: Flame, run: (router) => router.push("/habits") },
  { id: "calendar", label: "Calendar", icon: CalendarDays, run: (router) => router.push("/calendar") },
  { id: "captures", label: "Captures", icon: Layers, run: (router) => router.push("/captures") },
  { id: "projects", label: "Projects", icon: FolderKanban, run: (router) => router.push("/projects") },
  { id: "operations", label: "Operations", icon: Activity, run: (router) => router.push("/operations") },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => item.label.toLowerCase().includes(needle))
  }, [query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  useEffect(() => {
    function onOpenEvent() {
      setOpen(true)
    }
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  function runItem(item: PaletteItem) {
    item.run(router)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="gap-0 border-[var(--today-line)] bg-[var(--today-sidebar)] p-0 text-[var(--today-ink)] sm:max-w-md"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
        </DialogHeader>
        <div className="border-b border-[var(--today-line)] p-3">
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setActiveIndex((index) => Math.max(index - 1, 0))
              } else if (event.key === "Enter") {
                event.preventDefault()
                const item = filtered[activeIndex]
                if (item) runItem(item)
              }
            }}
            placeholder="Jump to a page or run a command…"
            aria-label="Search commands and pages"
            className="w-full bg-transparent text-sm text-[var(--today-ink)] outline-none placeholder:text-[var(--today-muted)]"
          />
        </div>
        <div role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
          {filtered.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                  index === activeIndex
                    ? "bg-[var(--today-panel-muted)] text-[var(--today-ink)]"
                    : "text-[var(--today-muted)]"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runItem(item)}
              >
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {item.hint ? <span className="text-xs text-[var(--today-muted)]">{item.hint}</span> : null}
              </button>
            )
          })}
          {!filtered.length ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--today-muted)]">No matches.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
