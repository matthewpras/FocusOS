"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { Search, Trash2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
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
  const { user } = useAuth()
  const { tasks, addTask, updateTask, deleteTask } = useTasks(user?.id)
  const [text, setText] = useState("")
  const [query, setQuery] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [category, setCategory] = useState<Category>("work")
  const [dueDate, setDueDate] = useState("")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

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

  return (
    <AppShell>
      <PageHeader title="Tasks" detail="Sort work by urgency without making task management a second job." />
      <section className="grid gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md lg:grid-cols-[1fr_140px_150px_160px_auto]">
        <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="New task" className="border-white/[0.08] bg-black/20" />
        <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="border-white/[0.08] bg-black/20" />
        <Button onClick={createTask}>Add</Button>
      </section>

      <section className="grid gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 lg:grid-cols-[1fr_150px_150px_150px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="border-white/[0.08] bg-black/20 pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">all priorities</SelectItem>{priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(value) => setFilterCategory(value ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">all categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">all status</SelectItem><SelectItem value="open">open</SelectItem><SelectItem value="completed">completed</SelectItem></SelectContent>
        </Select>
      </section>

      <div className="space-y-5">
        {Object.entries(groupTasks(filtered)).map(([label, items]) => (
          <section key={label} className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium text-white">{label}</h2>
              <span className="text-xs text-white/40">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-md bg-black/20 p-3">
                  <input type="checkbox" checked={task.completed} onChange={(event) => updateTask(task.id, { completed: event.target.checked })} className="size-4 accent-white" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{task.text}</p>
                    <p className="text-xs text-white/40">{task.priority} / {task.category ?? "other"}{task.due_date ? ` / ${task.due_date}` : ""}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {!items.length ? <p className="py-2 text-sm text-white/35">None.</p> : null}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  )
}
