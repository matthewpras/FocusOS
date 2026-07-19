"use client"

import { AppShell } from "@/components/app-shell"
import { ErrorBanner } from "@/components/error-banner"
import { PageHeader } from "@/components/page-header"
import { TaskBucketList } from "@/components/task-bucket-list"
import { useAuth } from "@/hooks/use-auth"
import { useTasks } from "@/hooks/useTasks"
import { getUpcomingTasks } from "@/lib/task-buckets"

export default function UpcomingPage() {
  const { user } = useAuth()
  const { tasks, error, updateTask, deleteTask, refresh } = useTasks(user?.id)
  const upcoming = getUpcomingTasks(tasks)

  return (
    <AppShell>
      <PageHeader title="Upcoming" detail="Open tasks with a due date ahead of today." />
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      <TaskBucketList
        tasks={upcoming}
        onToggleComplete={(task, completed) => updateTask(task.id, { completed })}
        onDelete={deleteTask}
        emptyLabel="Nothing scheduled ahead."
      />
    </AppShell>
  )
}
