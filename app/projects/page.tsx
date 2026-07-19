"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
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
import { useProjects, projectStatuses } from "@/hooks/useProjects"
import type { Priority, ProjectStatus } from "@/types"

const priorities: Priority[] = ["low", "medium", "high"]

export default function ProjectsPage() {
  const { user } = useAuth()
  const { projects, error, addProject, updateProject, archiveProject, refresh } = useProjects(user?.id)
  const [name, setName] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")

  async function createProject() {
    await addProject({ name, priority })
    setName("")
  }

  return (
    <AppShell>
      <PageHeader title="Projects" detail="The active efforts behind your tasks — create, prioritize, and retire them here." />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      <section className="grid gap-3 rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-4 shadow-[0_18px_44px_rgb(0_0_0/0.2)] sm:grid-cols-[1fr_140px_auto]">
        <Input
          aria-label="New project name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New project"
          className="border-[var(--today-line)] bg-[var(--today-panel)]"
        />
        <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
          <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            {priorities.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={createProject}>Add</Button>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <section
            key={project.id}
            className="rounded-lg border border-[var(--today-line)] bg-[var(--today-surface)] p-5 text-[var(--today-ink)] shadow-[0_18px_44px_rgb(0_0_0/0.2)]"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{project.name}</h2>
                {project.target_date ? (
                  <p className="mt-1 text-xs text-[var(--today-muted)]">Target {project.target_date}</p>
                ) : null}
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Archive "${project.name}"`}
                className="size-11 shrink-0"
                onClick={() => archiveProject(project.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={project.status}
                onValueChange={(value) => updateProject(project.id, { status: value as ProjectStatus })}
              >
                <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projectStatuses.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={project.priority}
                onValueChange={(value) => updateProject(project.id, { priority: value as Priority })}
              >
                <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        ))}
        {!projects.length ? (
          <section className="rounded-lg border border-dashed border-[var(--today-line)] p-8 text-sm text-[var(--today-muted)]">
            No projects yet. Add your first one above.
          </section>
        ) : null}
      </div>
    </AppShell>
  )
}
