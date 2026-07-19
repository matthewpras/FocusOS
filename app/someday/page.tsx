"use client"

import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { TaskBucketList } from "@/components/task-bucket-list"
import { useAuth } from "@/hooks/use-auth"
import { useTasks } from "@/hooks/useTasks"
import { getSomedayTasks } from "@/lib/task-buckets"

export default function SomedayPage() {
  const { user } = useAuth()
  const { tasks, error, updateTask, deleteTask, refresh } = useTasks(user?.id)
  const someday = getSomedayTasks(tasks)

  return (
    <AppShell>
      <PageHeader title="Someday" detail="Low-priority, no due date. Backlog worth keeping, not acting on yet." />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      <TaskBucketList
        tasks={someday}
        onToggleComplete={(task, completed) => updateTask(task.id, { completed })}
        onDelete={deleteTask}
        emptyLabel="Backlog is empty."
      />
    </AppShell>
  )
}
