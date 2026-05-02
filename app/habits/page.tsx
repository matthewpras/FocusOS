"use client"

import { Trash2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { buildHeatmap } from "@/lib/streak"
import { useAuth } from "@/hooks/use-auth"
import { useHabits } from "@/hooks/useHabits"
import { useState } from "react"

export default function HabitsPage() {
  const { user } = useAuth()
  const { habits, addHabit, toggleHabit, archiveHabit } = useHabits(user?.id)
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("✓")
  const [color, setColor] = useState("#60A5FA")

  async function createHabit() {
    await addHabit({ name, icon, color })
    setName("")
  }

  return (
    <AppShell>
      <PageHeader title="Habits" detail="Track small daily signals and keep streaks visible." />
      <section className="grid gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-md sm:grid-cols-[1fr_80px_90px_auto]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New habit" className="border-white/[0.08] bg-black/20" />
        <Input value={icon} onChange={(event) => setIcon(event.target.value.slice(0, 2))} className="border-white/[0.08] bg-black/20" />
        <Input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-10 border-white/[0.08] bg-black/20 p-1" />
        <Button onClick={createHabit}>Add</Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {habits.map((habit) => (
          <section key={habit.id} className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-md">
            <div className="mb-5 flex items-start gap-3">
              <button
                className="grid size-12 place-items-center rounded-lg text-lg"
                style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
                onClick={() => toggleHabit(habit.id)}
              >
                {habit.icon}
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-white">{habit.name}</h2>
                <p className="text-sm text-white/45">
                  {habit.currentStreak} day current / {habit.longestStreak} best
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => archiveHabit(habit.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {buildHeatmap(habit.logs).map((day) => (
                <div
                  key={day.date}
                  title={day.label}
                  className="aspect-square rounded-[3px] border border-white/[0.05]"
                  style={{
                    backgroundColor: day.completed ? habit.color : "rgba(255,255,255,0.04)",
                  }}
                />
              ))}
            </div>
          </section>
        ))}
        {!habits.length ? (
          <section className="rounded-lg border border-dashed border-white/[0.12] p-8 text-sm text-white/45">
            Add first habit.
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
