"use client"

import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HabitWithStats } from "@/types"

export function HabitsTodayWidget({
  habits,
  onToggle,
}: {
  habits: HabitWithStats[]
  onToggle: (habitId: string) => void
}) {
  return (
    <div className="space-y-3">
      {habits.slice(0, 4).map((habit) => (
        <button
          key={habit.id}
          className="flex w-full items-center gap-3 rounded-md bg-black/20 p-3 text-left transition hover:bg-white/[0.06]"
          onClick={() => onToggle(habit.id)}
        >
          <span
            className="grid size-9 place-items-center rounded-md text-sm"
            style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
          >
            {habit.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">{habit.name}</span>
          <span className="text-xs text-white/45">{habit.currentStreak}d</span>
          <span
            className="size-3 rounded-full border border-white/20"
            style={{
              backgroundColor: habit.completedToday ? habit.color : "transparent",
            }}
          />
        </button>
      ))}
      {!habits.length ? (
        <div className="rounded-md border border-dashed border-white/[0.1] p-5 text-sm text-white/45">
          No habits yet.
        </div>
      ) : null}
      <Link href="/habits" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
        Open habits
      </Link>
    </div>
  )
}
