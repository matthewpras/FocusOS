"use client"

import Link from "next/link"
import { CheckSquare, Flame, Inbox, LayoutDashboard } from "lucide-react"

const nav = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/capture", label: "Inbox", icon: Inbox },
]

export function MobileNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-lg border border-white/[0.08] bg-black/80 p-1 backdrop-blur-xl lg:hidden">
      {nav.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] text-white/65"
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
