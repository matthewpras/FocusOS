"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, CheckSquare, Flame, Inbox, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/capture", label: "Inbox", icon: Inbox },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 grid grid-cols-5 rounded-2xl border border-white/[0.08] bg-black/85 p-1 backdrop-blur-xl lg:hidden">
      {nav.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] text-white/65",
              active && "bg-white/[0.08] text-white",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
