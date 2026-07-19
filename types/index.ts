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
  obsidian_export_status: "pending" | "exported" | "fallback" | "failed" | null
  obsidian_exported_at: string | null
  obsidian_export_path: string | null
  assistant_key: string | null
  assistant_source: string | null
  created_by_assistant: boolean
  created_at: string
}

export type CaptureLink = {
  url: string
  kind: "tiktok" | "youtube" | "link" | string
  title?: string | null
}

export type CaptureMediaItem = {
  name: string
  type: string
  size: number
  data_url?: string | null
}

export type CaptureIntake = {
  id: string
  user_id: string
  capture_id: string | null
  intake_type: "task" | "event" | "obsidian_note" | "school_item" | "follow_up" | "finance_item" | "automation_idea" | "ignore" | "decision_needed"
  title: string | null
  summary: string | null
  source_link: string | null
  tags: string[]
  key_takeaways: unknown[]
  what_this_means_for_me: string | null
  obsidian_target: string | null
  decision_needed: boolean
  triage_status: "new" | "reviewed" | "converted" | "archived"
  raw_note: string | null
  links: CaptureLink[]
  media_items: CaptureMediaItem[]
  payload: Record<string, unknown>
  agent_status: "queued" | "processing" | "analyzed" | "synced" | "failed"
  created_at: string
  updated_at: string
}

export type RichCaptureInput = {
  note: string
  links?: CaptureLink[]
  mediaItems?: CaptureMediaItem[]
  obsidianTarget?: string
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

export type AgentName = "Hermes" | "Nova" | "Atlas" | "Pulse" | "Dev"

export type AgentEvent = {
  id: string
  user_id: string
  agent_name: AgentName
  run_id: string | null
  event_type: string
  target_table: string | null
  target_id: string | null
  action: string
  status: "success" | "warning" | "failed"
  summary: string | null
  payload: Record<string, unknown>
  error_text: string | null
  created_at: string
}

export type BoardRecommendationStatus = "active" | "accepted" | "dismissed" | "archived"

export type BoardRecommendation = {
  id: string
  user_id: string
  domain_id: string | null
  project_id: string | null
  agent_name: AgentName
  title: string
  summary: string
  recommendation_type: "priority" | "risk" | "decision" | "review" | "school" | "finance" | "systems" | "health"
  priority: Priority
  status: BoardRecommendationStatus
  supporting_points: unknown[]
  suggested_actions: unknown[]
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type ProjectStatus = "active" | "paused" | "completed" | "archived"

export type Project = {
  id: string
  user_id: string
  domain_id: string | null
  name: string
  slug: string
  description: string | null
  status: ProjectStatus
  priority: Priority
  target_date: string | null
  last_touched_at: string | null
  slipping: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
