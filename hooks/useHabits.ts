"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, subDays } from "date-fns"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { computeCurrentStreak, computeLongestStreak } from "@/lib/streak"
import { scheduleUndo } from "@/lib/undo-manager"
import type { Habit, HabitLog, HabitWithStats } from "@/types"

export function useHabits(userId?: string) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()
  const today = format(new Date(), "yyyy-MM-dd")
  const pendingArchiveIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const start = format(subDays(new Date(), 90), "yyyy-MM-dd")
    const [{ data: habitsData, error: habitsError }, { data: logsData, error: logsError }] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("habit_logs")
        .select("*")
        .gte("logged_date", start)
        .order("logged_date", { ascending: false }),
    ])
    if (habitsError || logsError) {
      setError("Couldn't load habits.")
    } else {
      setError(null)
      const rows = (habitsData ?? []) as Habit[]
      setHabits(rows.filter((habit) => !pendingArchiveIds.current.has(habit.id)))
      setLogs((logsData ?? []) as HabitLog[])
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`habits-${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habits",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habit_logs",
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

  async function addHabit(input: Pick<Habit, "name" | "icon" | "color">) {
    if (!supabase || !userId || !input.name.trim()) return
    await supabase.from("habits").insert({
      user_id: userId,
      name: input.name.trim(),
      icon: input.icon || "Check",
      color: input.color || "#60A5FA",
    })
    await refresh()
  }

  async function toggleHabit(habitId: string) {
    if (!supabase || !userId) return
    const existing = logs.find(
      (log) => log.habit_id === habitId && log.logged_date === today,
    )

    if (existing) {
      setLogs((items) => items.filter((log) => log.id !== existing.id))
      await supabase.from("habit_logs").delete().eq("id", existing.id)
    } else {
      const optimistic: HabitLog = {
        id: crypto.randomUUID(),
        user_id: userId,
        habit_id: habitId,
        logged_date: today,
        created_at: new Date().toISOString(),
      }
      setLogs((items) => [optimistic, ...items])
      await supabase.from("habit_logs").insert({
        user_id: userId,
        habit_id: habitId,
        logged_date: today,
      })
    }
    await refresh()
  }

  function archiveHabit(id: string) {
    if (!supabase) return
    const habit = habits.find((item) => item.id === id)
    if (!habit) return

    pendingArchiveIds.current.add(id)
    setHabits((items) => items.filter((item) => item.id !== id))
    scheduleUndo(
      id,
      `"${habit.name}"`,
      async () => {
        await supabase.from("habits").update({ archived: true }).eq("id", id)
        pendingArchiveIds.current.delete(id)
      },
      () => {
        pendingArchiveIds.current.delete(id)
        setHabits((items) => (items.some((item) => item.id === id) ? items : [habit, ...items]))
      },
    )
  }

  const habitsWithStats = useMemo<HabitWithStats[]>(
    () =>
      habits.map((habit) => {
        const habitLogs = logs.filter((log) => log.habit_id === habit.id)
        return {
          ...habit,
          logs: habitLogs,
          currentStreak: computeCurrentStreak(habitLogs),
          longestStreak: computeLongestStreak(habitLogs),
          completedToday: habitLogs.some((log) => log.logged_date === today),
        }
      }),
    [habits, logs, today],
  )

  return {
    habits: habitsWithStats,
    loading,
    error,
    addHabit,
    toggleHabit,
    archiveHabit,
    refresh,
  }
}
