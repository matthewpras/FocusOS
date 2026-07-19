"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { CheckSquare, Search, Trash2, X } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { TaskRow } from "@/components/task-bucket-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { useTasks } from "@/hooks/useTasks"
import type { Category, Priority, Task } from "@/types"

const priorities: Priority[] = ["low", "medium", "high"]
const categories: Category[] = ["work", "personal", "health", "other"]

function groupTasks(tasks: Task[]) {
  const today = format(new Date(), "yyyy-MM-dd")
  return {
    Overdue: tasks.filter((task) => task.due_date && task.due_date < today && !task.completed),
    Today: tasks.filter((task) => task.due_date === today && !task.completed),
    Upcoming: tasks.filter((task) => task.due_date && task.due_date > today && !task.completed),
    "No date": tasks.filter((task) => !task.due_date && !task.completed),
    Completed: tasks.filter((task) => task.completed),
  }
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksPageInner />
    </Suspense>
  )
}

function TasksPageInner() {
  const { user } = useAuth()
  const { tasks, error, addTask, updateTask, deleteTask, refresh } = useTasks(user?.id)
  const searchParams = useSearchParams()
  const [text, setText] = useState("")
  const [query, setQuery] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [category, setCategory] = useState<Category>("work")
  const [dueDate, setDueDate] = useState("")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    const categoryParam = searchParams.get("category")
    setFilterCategory(categoryParam && categories.includes(categoryParam as Category) ? categoryParam : "all")
  }, [searchParams])

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (query && !task.text.toLowerCase().includes(query.toLowerCase())) return false
        if (filterPriority !== "all" && task.priority !== filterPriority) return false
        if (filterCategory !== "all" && task.category !== filterCategory) return false
        if (filterStatus === "open" && task.completed) return false
        if (filterStatus === "completed" && !task.completed) return false
        return true
      }),
    [filterCategory, filterPriority, filterStatus, query, tasks],
  )

  async function createTask() {
    await addTask({ text, priority, category, due_date: dueDate || null })
    setText("")
    setDueDate("")
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function completeSelected() {
    for (const id of selected) void updateTask(id, { completed: true })
    setSelected(new Set())
  }

  function deleteSelected() {
    for (const id of selected) deleteTask(id)
    setSelected(new Set())
  }

  return (
    <AppShell>
      <PageHeader title="Tasks" detail="Sort work by urgency without making task management a second job." />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      <section className="grid gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 shadow-[0_18px_44px_rgb(0_0_0/0.2)] lg:grid-cols-[1fr_140px_150px_160px_auto]">
        <Input aria-label="New task" value={text} onChange={(event) => setText(event.target.value)} placeholder="New task" className="border-[var(--today-line)] bg-[var(--today-panel)]" />
        <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
          <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
          <SelectContent>{priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
          <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Input aria-label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="border-[var(--today-line)] bg-[var(--today-panel)]" />
        <Button onClick={createTask}>Add</Button>
      </section>

      <section className="grid gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 shadow-[0_18px_44px_rgb(0_0_0/0.2)] lg:grid-cols-[1fr_150px_150px_150px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--today-muted)]" />
          <Input aria-label="Search tasks" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="border-[var(--today-line)] bg-[var(--today-panel)] pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value ?? "all")}>
          <SelectTrigger aria-label="Filter by priority"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">all priorities</SelectItem>{priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value ?? "all")}>
          <SelectTrigger aria-label="Filter by category"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">all categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value ?? "all")}>
          <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">all status</SelectItem><SelectItem value="open">open</SelectItem><SelectItem value="completed">completed</SelectItem></SelectContent>
        </Select>
      </section>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-panel)] px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={completeSelected}>
            <CheckSquare className="size-3.5" />
            Complete
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5 text-red-200 hover:text-red-100" onClick={deleteSelected}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={() => setSelected(new Set())}>
            <X className="size-3.5" />
            Clear
          </Button>
        </div>
      ) : null}

      <div className="space-y-5">
        {Object.entries(groupTasks(filtered)).map(([label, items]) => (
          <section key={label} className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">{label}</h2>
              <span className="text-xs text-[var(--today-muted)]">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((task) => (
                <div key={task.id} className="flex items-center gap-2">
                  <label className="-m-2 flex items-center justify-center p-2">
                    <input
                      type="checkbox"
                      aria-label={`Select "${task.text}"`}
                      checked={selected.has(task.id)}
                      onChange={() => toggleSelected(task.id)}
                      className="size-4 accent-[var(--today-blue)]"
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <TaskRow
                      task={task}
                      onToggleComplete={(t, completed) => updateTask(t.id, { completed })}
                      onDelete={deleteTask}
                    />
                  </div>
                </div>
              ))}
              {!items.length ? <p className="py-2 text-sm text-[var(--today-muted)]">Nothing here.</p> : null}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  )
}
