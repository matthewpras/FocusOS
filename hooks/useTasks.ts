"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { getRealtimeChannelName } from "@/lib/realtime-channel"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
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
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
    setTasks((data ?? []) as Task[])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(getRealtimeChannelName("tasks", userId))
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

  async function deleteTask(id: string) {
    if (!supabase) return
    setTasks((items) => items.filter((task) => task.id !== id))
    await supabase.from("tasks").delete().eq("id", id)
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

  return { tasks, loading, stats, addTask, updateTask, deleteTask, refresh }
}
