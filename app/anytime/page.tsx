"use client"

import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { TaskBucketList } from "@/components/task-bucket-list"
import { useAuth } from "@/hooks/use-auth"
import { useTasks } from "@/hooks/useTasks"
import { getAnytimeTasks } from "@/lib/task-buckets"

export default function AnytimePage() {
  const { user } = useAuth()
  const { tasks, error, updateTask, deleteTask, refresh } = useTasks(user?.id)
  const anytime = getAnytimeTasks(tasks)

  return (
    <AppShell>
      <PageHeader title="Anytime" detail="Open tasks with no due date, worth doing whenever there's room." />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      <TaskBucketList
        tasks={anytime}
        onToggleComplete={(task, completed) => updateTask(task.id, { completed })}
        onDelete={deleteTask}
        emptyLabel="Nothing sitting here."
      />
    </AppShell>
  )
}
