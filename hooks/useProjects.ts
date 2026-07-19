"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { scheduleUndo } from "@/lib/undo-manager"
import type { Priority, Project, ProjectStatus } from "@/types"

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `project-${Date.now()}`
}

export type NewProjectInput = {
  name: string
  priority?: Priority
  targetDate?: string | null
}

export function useProjects(userId?: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()

  const refresh = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from("projects")
      .select("*")
      .neq("status", "archived")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
    if (fetchError) {
      setError("Couldn't load projects.")
    } else {
      setError(null)
      setProjects((data ?? []) as Project[])
    }
    setLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel(`projects-${userId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
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

  async function addProject(input: NewProjectInput) {
    if (!supabase || !userId || !input.name.trim()) return
    const { error: insertError } = await supabase.from("projects").insert({
      user_id: userId,
      name: input.name.trim(),
      slug: slugify(input.name),
      priority: input.priority ?? "medium",
      target_date: input.targetDate || null,
    })
    if (insertError) {
      setError("Couldn't create project. Try a different name.")
      return
    }
    await refresh()
  }

  async function updateProject(id: string, patch: Partial<Project>) {
    if (!supabase) return
    setProjects((items) => items.map((project) => (project.id === id ? { ...project, ...patch } : project)))
    await supabase.from("projects").update(patch).eq("id", id)
  }

  function archiveProject(id: string) {
    if (!supabase) return
    const project = projects.find((item) => item.id === id)
    if (!project) return

    setProjects((items) => items.filter((item) => item.id !== id))
    scheduleUndo(
      id,
      `"${project.name}"`,
      async () => {
        await supabase.from("projects").update({ status: "archived" }).eq("id", id)
      },
      () => setProjects((items) => (items.some((item) => item.id === id) ? items : [project, ...items])),
    )
  }

  return { projects, loading, error, addProject, updateProject, archiveProject, refresh }
}

export const projectStatuses: ProjectStatus[] = ["active", "paused", "completed", "archived"]
