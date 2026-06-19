"use client"

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AppShell } from "@/components/app-shell"
import { AssistantSummaryCard } from "@/components/assistant-summary-card"
import { BentoTile } from "@/components/bento-tile"
import { CalendarAgendaCard } from "@/components/calendar-agenda-card"
import { PageHeader } from "@/components/page-header"
import { CaptureInboxWidget } from "@/components/widgets/CaptureInboxWidget"
import { HabitsTodayWidget } from "@/components/widgets/HabitsTodayWidget"
import { TasksTodayWidget } from "@/components/widgets/TasksTodayWidget"
import { useAssistant } from "@/hooks/useAssistant"
import { useAuth } from "@/hooks/use-auth"
import { useCaptures } from "@/hooks/useCaptures"
import { useExternalCommitments } from "@/hooks/useExternalCommitments"
import { useHabits } from "@/hooks/useHabits"
import { useIsMobile } from "@/hooks/use-mobile"
import { useObsidianSync } from "@/hooks/useObsidianSync"
import { useTasks } from "@/hooks/useTasks"
import { useTileOrder } from "@/hooks/useTileOrder"

function SortableTile({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={className}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

export default function Home() {
  const { user, session } = useAuth()
  const tasks = useTasks(user?.id)
  const habits = useHabits(user?.id)
  const captures = useCaptures(user?.id)
  const assistant = useAssistant(user?.id, session?.access_token)
  const commitments = useExternalCommitments(user?.id)
  const obsidianEnabled = process.env.NEXT_PUBLIC_OBSIDIAN_ENABLED !== "false"
  const obsidian = useObsidianSync(session?.access_token, obsidianEnabled)
  const { order, setOrder } = useTileOrder()
  const isMobile = useIsMobile()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const oldIndex = order.indexOf(String(event.active.id))
    const newIndex = order.indexOf(String(event.over.id))
    setOrder(arrayMove(order, oldIndex, newIndex))
  }

  const tiles = {
    tasks: (
      <SortableTile key="tasks" id="tasks" className="lg:col-span-8">
        <BentoTile title="Tasks Today" eyebrow="Now" glow="blue">
          <TasksTodayWidget
            tasks={tasks.tasks}
            onToggle={(task) => tasks.updateTask(task.id, { completed: true })}
          />
        </BentoTile>
      </SortableTile>
    ),
    calendar: (
      <SortableTile key="calendar" id="calendar" className="lg:col-span-4">
        <CalendarAgendaCard
          events={commitments.upcomingEvents}
          inboxSignals={commitments.inboxSignals}
        />
      </SortableTile>
    ),
    habits: (
      <SortableTile key="habits" id="habits" className="lg:col-span-4">
        <BentoTile title="Habits Today" eyebrow="Streaks" glow="violet">
          <HabitsTodayWidget
            habits={habits.habits}
            onToggle={habits.toggleHabit}
          />
        </BentoTile>
      </SortableTile>
    ),
    capture: (
      <SortableTile key="capture" id="capture" className="lg:col-span-8">
        <BentoTile title="Capture Inbox" eyebrow="Thoughts" glow="blue">
          <CaptureInboxWidget captures={captures.captures} />
        </BentoTile>
      </SortableTile>
    ),
  }

  return (
    <AppShell>
      <PageHeader
        title="Command center"
        detail="Today, calendar, habits, and loose thoughts in one quiet workspace."
      />
      <AssistantSummaryCard
        brief={assistant.brief}
        latestRun={assistant.latestRun}
        sourceState={assistant.sourceState}
        loading={assistant.loading}
        running={assistant.running}
        syncingBrief={obsidian.running === "brief"}
        error={assistant.error}
        obsidianError={obsidian.error}
        lastSyncedPath={obsidian.lastSyncedPath}
        onRunNow={assistant.runNow}
        onSyncBrief={obsidian.enabled ? obsidian.syncBrief : undefined}
      />
      {isMobile ? (
        <div className="grid gap-4 lg:grid-cols-12">
          {order.map((id) => tiles[id as keyof typeof tiles])}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid gap-4 lg:grid-cols-12">
              {order.map((id) => tiles[id as keyof typeof tiles])}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </AppShell>
  )
}
