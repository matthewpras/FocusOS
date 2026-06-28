"use client"

import Link from "next/link"
import {
  Archive,
  Activity,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Home,
  Inbox,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ProjectCounts = {
  work?: number
  health?: number
  learning?: number
  personal?: number
  finance?: number
  home?: number
}

type DarkTodaySidebarProps = {
  inboxCount: number
  projectCounts?: ProjectCounts
}

const primaryItems = [
  { label: "Today", icon: Home, href: "/" },
  { label: "Inbox", icon: Inbox },
  { label: "Upcoming", icon: CalendarDays },
  { label: "Operations", icon: Activity },
  { label: "Anytime", icon: CheckCircle2 },
  { label: "Someday", icon: Archive },
  { label: "Logbook", icon: BookOpen },
]

const projects: Array<{ key: keyof ProjectCounts; label: string; tone: string }> = [
  { key: "work", label: "Work", tone: "bg-[oklch(0.57_0.21_260)]" },
  { key: "health", label: "Health", tone: "bg-[oklch(0.63_0.14_160)]" },
  { key: "learning", label: "Learning", tone: "bg-[oklch(0.62_0.18_300)]" },
  { key: "personal", label: "Personal", tone: "bg-[oklch(0.69_0.14_78)]" },
  { key: "finance", label: "Finance", tone: "bg-[oklch(0.58_0.16_210)]" },
  { key: "home", label: "Home", tone: "bg-[oklch(0.61_0.15_35)]" },
]

export function DarkTodaySidebar({
  inboxCount,
  projectCounts = {},
}: DarkTodaySidebarProps) {
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[var(--today-sidebar)] px-3 py-4 text-white lg:flex">
      <div className="mb-4 flex items-center justify-between px-2">
        <div>
          <p className="text-sm font-semibold leading-5">FocusOS</p>
          <p className="text-xs text-[var(--today-sidebar-muted)]">Today</p>
        </div>
        <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-medium text-white/54">
          Read-only projects
        </span>
      </div>

      <nav className="space-y-1" aria-label="Today navigation">
        {primaryItems.map((item) => {
          const Icon = item.icon
          const count = item.label === "Inbox" ? inboxCount : undefined

          const active = item.href === "/"
          const className = cn(
            "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm text-white/72 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45",
            item.href
              ? "hover:bg-white/8 hover:text-white"
              : "cursor-default text-white/45",
            active && "bg-white/12 text-white",
          )
          const content = (
            <>
              <Icon className="size-4" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {typeof count === "number" && count > 0 ? (
                <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[11px] tabular-nums text-white/78">
                  {count}
                </span>
              ) : null}
            </>
          )

          return item.href ? (
            <Link key={item.label} href={item.href} className={className}>
              {content}
            </Link>
          ) : (
            <div key={item.label} className={className} aria-disabled="true">
              {content}
            </div>
          )
        })}
      </nav>

      <div className="mt-6 px-2 text-xs font-medium text-[var(--today-sidebar-muted)]">
        Projects
      </div>
      <nav className="mt-2 space-y-1" aria-label="Projects">
        {projects.map((project) => (
          <div
            key={project.key}
            className="flex h-8 w-full cursor-not-allowed items-center gap-2 rounded-md px-2 text-left text-sm text-white/45"
            aria-disabled="true"
          >
            <span className={cn("size-2.5 rounded-full", project.tone)} />
            <span className="min-w-0 flex-1 truncate">{project.label}</span>
            {projectCounts[project.key] ? (
              <span className="text-xs tabular-nums text-white/45">
                {projectCounts[project.key]}
              </span>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/10 pt-3">
        <div
          className="flex h-9 w-full cursor-not-allowed items-center gap-2 rounded-md px-2 text-left text-sm text-white/45"
          aria-disabled="true"
        >
          <Settings className="size-4" />
          Settings
        </div>
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-[var(--today-sidebar-muted)]">
          <Circle className="size-2 fill-current" />
          Local command center
        </div>
      </div>
    </aside>
  )
}
