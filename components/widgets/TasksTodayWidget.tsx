"use client"

import Link from "next/link"
import { format } from "date-fns"
import { CheckCircle2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"

export function TasksTodayWidget({
  tasks,
  onToggle,
}: {
  tasks: Task[]
  onToggle: (task: Task) => void
}) {
  const today = format(new Date(), "yyyy-MM-dd")
  const visible = tasks
    .filter((task) => task.due_date === today && !task.completed)
    .slice(0, 5)

  return (
    <div className="space-y-3">
      {visible.length ? (
        visible.map((task) => (
          <button
            key={task.id}
            className="flex w-full items-center gap-3 rounded-md border border-white/[0.06] bg-black/20 p-3 text-left transition hover:bg-white/[0.06]"
            onClick={() => onToggle(task)}
          >
            <CheckCircle2 className="size-5 text-white/35" />
            <span className="min-w-0 flex-1 truncate text-sm">{task.text}</span>
            <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[11px] uppercase text-white/50">
              {task.priority}
            </span>
          </button>
        ))
      ) : (
        <div className="rounded-md border border-dashed border-white/[0.1] p-5 text-sm text-white/45">
          Today clear.
        </div>
      )}
      <Link href="/tasks" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
        Open tasks
      </Link>
    </div>
  )
}
