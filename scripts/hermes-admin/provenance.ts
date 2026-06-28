import type { HermesAgentName } from "./env"

export type AgentEventStatus = "success" | "warning" | "failed"

export type SourceKind =
  | "manual_user"
  | "hermes_direct"
  | "assistant_run"
  | "gmail_sync"
  | "calendar_sync"
  | "obsidian_import"
  | "youtube_intake"
  | "web_capture"
  | "system_rule"

type ProvenanceInput = {
  agentName: HermesAgentName
  runId?: string | null
  sourceKind?: SourceKind | null
  sourceRef?: string | null
  confidence?: number | null
  updatedBy?: string | null
}

type AgentEventInput = {
  userId: string
  agentName: HermesAgentName
  runId?: string | null
  eventType: string
  targetTable?: string | null
  targetId?: string | null
  action: string
  status?: AgentEventStatus
  summary?: string | null
  payload?: Record<string, unknown>
  errorText?: string | null
}

function clampConfidence(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return Math.min(1, Math.max(0, Number(value.toFixed(4))))
}

export function buildProvenance(input: ProvenanceInput) {
  return {
    source_agent: input.agentName,
    source_run_id: input.runId ?? null,
    source_kind: input.sourceKind ?? null,
    source_ref: input.sourceRef ?? null,
    created_by_agent: true,
    agent_confidence: clampConfidence(input.confidence),
    updated_by: input.updatedBy ?? input.agentName,
  }
}

export function buildAgentEvent(input: AgentEventInput) {
  return {
    user_id: input.userId,
    agent_name: input.agentName,
    run_id: input.runId ?? null,
    event_type: input.eventType,
    target_table: input.targetTable ?? null,
    target_id: input.targetId ?? null,
    action: input.action,
    status: input.status ?? "success",
    summary: input.summary ?? null,
    payload: input.payload ?? {},
    error_text: input.errorText ?? null,
  }
}
