"use client"

import { Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Task } from "@/types"

export function TaskRow({
  task,
  onToggleComplete,
  onDelete,
}: {
  task: Task
  onToggleComplete: (task: Task, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-[var(--today-panel)] p-3">
      <label className="-m-2 flex items-center justify-center p-2">
        <input
          type="checkbox"
          aria-label={`Mark "${task.text}" ${task.completed ? "incomplete" : "complete"}`}
          checked={task.completed}
          onChange={(event) => onToggleComplete(task, event.target.checked)}
          className="size-4 accent-[var(--today-blue)]"
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{task.text}</p>
        <p className="text-xs text-[var(--today-muted)]">
          {task.priority} / {task.category ?? "other"}
          {task.due_date ? ` / ${task.due_date}` : ""}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Delete "${task.text}"`}
        className="size-11"
        onClick={() => onDelete(task.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export function TaskBucketList({
  tasks,
  onToggleComplete,
  onDelete,
  emptyLabel,
}: {
  tasks: Task[]
  onToggleComplete: (task: Task, completed: boolean) => void
  onDelete: (id: string) => void
  emptyLabel: string
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return tasks
    return tasks.filter((task) => task.text.toLowerCase().includes(needle))
  }, [tasks, query])

  return (
    <section className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
      {tasks.length ? (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--today-muted)]" />
          <Input
            aria-label="Search this list"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="border-[var(--today-line)] bg-[var(--today-panel)] pl-9"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        {filtered.map((task) => (
          <TaskRow key={task.id} task={task} onToggleComplete={onToggleComplete} onDelete={onDelete} />
        ))}
        {!tasks.length ? <p className="py-2 text-sm text-[var(--today-muted)]">{emptyLabel}</p> : null}
        {tasks.length && !filtered.length ? (
          <p className="py-2 text-sm text-[var(--today-muted)]">No tasks match.</p>
        ) : null}
      </div>
    </section>
  )
}
