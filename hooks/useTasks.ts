"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { scheduleUndo } from "@/lib/undo-manager"
import type { Category, Priority, Task } from "@/types"

export type NewTaskInput = {
  text: string
  priority?: Priority
  due_date?: string | null
  category?: Category | null
}

export function useTasks(userId?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()
  const pendingDeleteIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
    if (fetchError) {
      setError("Couldn't load tasks.")
    } else {
      setError(null)
      const rows = (data ?? []) as Task[]
      setTasks(rows.filter((task) => !pendingDeleteIds.current.has(task.id)))
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`tasks-${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh, supabase, userId])

  async function addTask(input: NewTaskInput) {
    if (!supabase || !userId || !input.text.trim()) return
    await supabase.from("tasks").insert({
      user_id: userId,
      text: input.text.trim(),
      priority: input.priority ?? "medium",
      due_date: input.due_date || null,
      category: input.category ?? "other",
    })
    await refresh()
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    if (!supabase) return
    setTasks((items) =>
      items.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    )
    await supabase.from("tasks").update(patch).eq("id", id)
    await refresh()
  }

  function deleteTask(id: string) {
    if (!supabase) return
    const task = tasks.find((item) => item.id === id)
    if (!task) return

    pendingDeleteIds.current.add(id)
    setTasks((items) => items.filter((item) => item.id !== id))
    scheduleUndo(
      id,
      `"${task.text}"`,
      async () => {
        await supabase.from("tasks").delete().eq("id", id)
        pendingDeleteIds.current.delete(id)
      },
      () => {
        pendingDeleteIds.current.delete(id)
        setTasks((items) => (items.some((item) => item.id === id) ? items : [task, ...items]))
      },
    )
  }

  const today = format(new Date(), "yyyy-MM-dd")
  const stats = useMemo(
    () => ({
      today: tasks.filter((task) => task.due_date === today && !task.completed),
      overdue: tasks.filter(
        (task) => task.due_date && task.due_date < today && !task.completed,
      ),
      completed: tasks.filter((task) => task.completed),
    }),
    [tasks, today],
  )

  return { tasks, loading, error, stats, addTask, updateTask, deleteTask, refresh }
}
