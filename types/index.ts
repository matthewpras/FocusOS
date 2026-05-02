export type Priority = "low" | "medium" | "high"
export type Category = "work" | "personal" | "health" | "other"

export type Task = {
  id: string
  user_id: string
  text: string
  completed: boolean
  priority: Priority
  due_date: string | null
  category: Category | null
  assistant_key: string | null
  assistant_source: string | null
  created_by_assistant: boolean
  created_at: string
  updated_at: string
}

export type Habit = {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  archived: boolean
  assistant_key: string | null
  assistant_source: string | null
  created_by_assistant: boolean
  created_at: string
  updated_at: string
}

export type HabitLog = {
  id: string
  user_id: string
  habit_id: string
  logged_date: string
  created_at: string
}

export type HabitWithStats = Habit & {
  logs: HabitLog[]
  currentStreak: number
  longestStreak: number
  completedToday: boolean
}

export type Capture = {
  id: string
  user_id: string
  text: string
  converted: boolean
  assistant_key: string | null
  assistant_source: string | null
  created_by_assistant: boolean
  created_at: string
}

export type AssistantRunStatus =
  | "success"
  | "no_change"
  | "partial_failure"
  | "failed"

export type AssistantTriggerSource = "manual" | "cron"

export type AssistantRun = {
  id: string
  user_id: string
  status: AssistantRunStatus
  trigger_source: AssistantTriggerSource
  summary: string | null
  changes: string[]
  errors: string[]
  sources: Record<string, unknown>
  started_at: string
  finished_at: string | null
}

export type AssistantBrief = {
  id: string
  user_id: string
  run_id: string | null
  summary: string
  top_priorities: string[]
  first_focus_block: string | null
  risks: string[]
  next_actions: string[]
  focus_note: string | null
  changed: boolean
  created_at: string
}

export type ExternalCommitmentSource = "google_calendar" | "gmail"

export type ExternalCommitment = {
  id: string
  user_id: string
  source: ExternalCommitmentSource
  source_id: string
  title: string
  details: string | null
  starts_at: string | null
  due_date: string | null
  confidence: number
  action_hint: string | null
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type AssistantSourceState = {
  user_id: string
  calendar_last_synced_at: string | null
  gmail_last_synced_at: string | null
  last_successful_run_at: string | null
  last_attempted_run_at: string | null
  next_suggested_run_at: string | null
  status: AssistantRunStatus | "idle"
  error_text: string | null
  updated_at: string
}
