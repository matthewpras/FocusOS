import test from "node:test"
import assert from "node:assert/strict"

const provenanceModule = await import("./provenance.ts")

test("buildProvenance returns contract fields", () => {
  const provenance = provenanceModule.buildProvenance({
    agentName: "Hermes",
    runId: "run-123",
    sourceKind: "gmail_sync",
    sourceRef: "message-1",
    confidence: 0.87649,
    updatedBy: "Hermes",
  })

  assert.deepEqual(provenance, {
    source_agent: "Hermes",
    source_run_id: "run-123",
    source_kind: "gmail_sync",
    source_ref: "message-1",
    created_by_agent: true,
    agent_confidence: 0.8765,
    updated_by: "Hermes",
  })
})

test("buildProvenance clamps invalid confidence values", () => {
  assert.equal(
    provenanceModule.buildProvenance({
      agentName: "Hermes",
      confidence: 2,
    }).agent_confidence,
    1,
  )

  assert.equal(
    provenanceModule.buildProvenance({
      agentName: "Hermes",
      confidence: Number.NaN,
    }).agent_confidence,
    null,
  )
})

test("buildAgentEvent creates audit payload", () => {
  const event = provenanceModule.buildAgentEvent({
    userId: "user-1",
    agentName: "Hermes",
    runId: "run-123",
    eventType: "write",
    targetTable: "tasks",
    targetId: "00000000-0000-0000-0000-000000000001",
    action: "upsert_task",
    status: "success",
    summary: "Created task from Gmail",
    payload: { subject: "Tuition deadline" },
  })

  assert.deepEqual(event, {
    user_id: "user-1",
    agent_name: "Hermes",
    run_id: "run-123",
    event_type: "write",
    target_table: "tasks",
    target_id: "00000000-0000-0000-0000-000000000001",
    action: "upsert_task",
    status: "success",
    summary: "Created task from Gmail",
    payload: { subject: "Tuition deadline" },
    error_text: null,
  })
})
