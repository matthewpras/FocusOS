"use client"

import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { TaskBucketList } from "@/components/task-bucket-list"
import { useAuth } from "@/hooks/use-auth"
import { useTasks } from "@/hooks/useTasks"
import { getLogbookTasks } from "@/lib/task-buckets"

export default function LogbookPage() {
  const { user } = useAuth()
  const { tasks, error, updateTask, deleteTask, refresh } = useTasks(user?.id)
  const logbook = getLogbookTasks(tasks)

  return (
    <AppShell>
      <PageHeader title="Logbook" detail="Completed tasks, most recent first." />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      <TaskBucketList
        tasks={logbook}
        onToggleComplete={(task, completed) => updateTask(task.id, { completed })}
        onDelete={deleteTask}
        emptyLabel="Nothing completed yet."
      />
    </AppShell>
  )
}
