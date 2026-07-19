"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  Activity,
  Archive,
  Bot,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  FolderKanban,
  Home,
  Inbox,
  Layers,
  LogOut,
  Search,
} from "lucide-react"
import { OPEN_ASSISTANT_CHAT_EVENT } from "@/components/assistant-chat-panel"
import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/command-palette"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Category } from "@/types"

type ProjectCounts = Partial<Record<Category, number>>

const gtdItems = [
  { href: "/", label: "Today", icon: Home },
  { href: "/capture", label: "Inbox", icon: Inbox, countKey: "inbox" as const },
  { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
  { href: "/anytime", label: "Anytime", icon: CheckCircle2 },
  { href: "/someday", label: "Someday", icon: Archive },
  { href: "/logbook", label: "Logbook", icon: BookOpen },
  { href: "/operations", label: "Operations", icon: Activity },
]

const viewItems = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/captures", label: "Captures", icon: Layers },
  { href: "/projects", label: "Projects", icon: FolderKanban },
]

const projects: Array<{ key: Category; label: string; tone: string }> = [
  { key: "work", label: "Work", tone: "bg-[oklch(0.57_0.21_260)]" },
  { key: "health", label: "Health", tone: "bg-[oklch(0.63_0.14_160)]" },
  { key: "personal", label: "Personal", tone: "bg-[oklch(0.69_0.14_78)]" },
  { key: "other", label: "Other", tone: "bg-[oklch(0.61_0.15_35)]" },
]

export function AppSidebar({
  email,
  inboxCount,
  projectCounts = {},
  onSignOut,
}: {
  email?: string | null
  inboxCount: number
  projectCounts?: ProjectCounts
  onSignOut: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCategory = pathname === "/tasks" ? searchParams.get("category") : null

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[var(--today-sidebar)] px-3 py-4 text-white lg:flex">
      <Link href="/" className="mb-4 flex items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
          <Home className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-5">Focus OS</p>
          <p className="text-xs text-[var(--today-sidebar-muted)]">Daily command center</p>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
        className="mb-2 flex h-9 w-full items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 text-sm text-white/55 hover:bg-white/8 hover:text-white"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search</span>
        <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/45">⌘K</span>
      </button>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_CHAT_EVENT))}
        className="mb-4 flex h-9 w-full items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 text-sm text-white/55 hover:bg-white/8 hover:text-white"
      >
        <Bot className="size-4" />
        <span className="flex-1 text-left">Chat with Hermes</span>
      </button>

      <nav className="space-y-1" aria-label="Primary">
        {gtdItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          const count = item.countKey === "inbox" ? inboxCount : undefined
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-white/72 transition-colors hover:bg-white/8 hover:text-white",
                active && "bg-white/12 text-white",
              )}
            >
              <Icon className="size-4" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {typeof count === "number" && count > 0 ? (
                <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[11px] tabular-nums text-white/78">
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 px-2 text-xs font-medium text-[var(--today-sidebar-muted)]">Views</div>
      <nav className="mt-2 space-y-1" aria-label="Views">
        {viewItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href && !activeCategory
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-white/72 transition-colors hover:bg-white/8 hover:text-white",
                active && "bg-white/12 text-white",
              )}
            >
              <Icon className="size-4" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 px-2 text-xs font-medium text-[var(--today-sidebar-muted)]">
        Categories
      </div>
      <nav className="mt-2 space-y-1" aria-label="Categories">
        {projects.map((project) => {
          const active = activeCategory === project.key
          return (
            <Link
              key={project.key}
              href={`/tasks?category=${project.key}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-white/72 transition-colors hover:bg-white/8 hover:text-white",
                active && "bg-white/12 text-white",
              )}
            >
              <span className={cn("size-2.5 rounded-full", project.tone)} />
              <span className="min-w-0 flex-1 truncate">{project.label}</span>
              {projectCounts[project.key] ? (
                <span className="text-xs tabular-nums text-white/50">
                  {projectCounts[project.key]}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="truncate text-xs text-white/50">{email ?? "Local preview"}</p>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 h-8 w-full justify-start gap-2 text-white/70"
          onClick={onSignOut}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
