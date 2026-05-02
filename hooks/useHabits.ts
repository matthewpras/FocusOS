"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format, subDays } from "date-fns"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { computeCurrentStreak, computeLongestStreak } from "@/lib/streak"
import type { Habit, HabitLog, HabitWithStats } from "@/types"

export function useHabits(userId?: string) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowser()
  const today = format(new Date(), "yyyy-MM-dd")

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const start = format(subDays(new Date(), 90), "yyyy-MM-dd")
    const [{ data: habitsData }, { data: logsData }] = await Promise.all([
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
    setHabits((habitsData ?? []) as Habit[])
    setLogs((logsData ?? []) as HabitLog[])
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

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

  async function archiveHabit(id: string) {
    if (!supabase) return
    setHabits((items) => items.filter((habit) => habit.id !== id))
    await supabase.from("habits").update({ archived: true }).eq("id", id)
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
    addHabit,
    toggleHabit,
    archiveHabit,
    refresh,
  }
}
