"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CheckSquare,
  Flame,
  Inbox,
  LayoutDashboard,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/capture", label: "Inbox", icon: Inbox },
]

export function AppSidebar({
  email,
  inboxCount,
  onSignOut,
}: {
  email?: string | null
  inboxCount: number
  onSignOut: () => void
}) {
  const pathname = usePathname()

  return (
    <aside className="hidden min-h-screen w-64 shrink-0 border-r border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
          <LayoutDashboard className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Focus OS</p>
          <p className="text-xs text-white/45">Daily command center</p>
        </div>
      </Link>

      <nav className="space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-white/62 transition",
                active && "bg-white/[0.08] text-white",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {item.href === "/capture" && inboxCount > 0 ? (
                <span className="ml-auto rounded-full bg-[var(--accent-violet)] px-2 py-0.5 text-xs text-white">
                  {inboxCount}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto rounded-lg border border-white/[0.08] bg-black/20 p-3">
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
