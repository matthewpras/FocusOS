import test from "node:test"
import assert from "node:assert/strict"

const writes = await import("./writes.ts")

function createFakeSupabase() {
  const calls = []

  function resultChain(data) {
    return {
      error: null,
      select(columns) {
        calls.push({ method: "select", columns })
        return {
          async single() {
            return { data, error: null }
          },
        }
      },
    }
  }

  return {
    calls,
    from(table) {
      return {
        insert(payload) {
          calls.push({ table, method: "insert", payload })
          return resultChain({ id: `${table}-id` })
        },
        update(payload) {
          calls.push({ table, method: "update", payload })
          return {
            eq(column, value) {
              calls.push({ table, method: "eq", column, value })
              return resultChain({ id: value })
            },
          }
        },
      }
    },
  }
}

function context(supabase = createFakeSupabase()) {
  return {
    supabase,
    userId: "user-1",
    agentName: "Hermes",
    runId: "run-1",
  }
}

test("createCaptureIntake writes intake row with provenance and audit event", async () => {
  const supabase = createFakeSupabase()
  const id = await writes.createCaptureIntake(context(supabase), {
    intakeType: "task",
    title: "Tuition deadline",
    summary: "Pay tuition",
    sourceKind: "gmail_sync",
    sourceRef: "message-1",
    confidence: 0.88444,
    tags: ["school"],
  })

  assert.equal(id, "capture_intake-id")

  const intake = supabase.calls.find(
    (call) => call.table === "capture_intake" && call.method === "insert",
  )
  assert.equal(intake.payload.user_id, "user-1")
  assert.equal(intake.payload.intake_type, "task")
  assert.equal(intake.payload.source_agent, "Hermes")
  assert.equal(intake.payload.source_run_id, "run-1")
  assert.equal(intake.payload.source_kind, "gmail_sync")
  assert.equal(intake.payload.agent_confidence, 0.8844)

  const audit = supabase.calls.find(
    (call) => call.table === "agent_events" && call.method === "insert",
  )
  assert.equal(audit.payload.target_table, "capture_intake")
  assert.equal(audit.payload.target_id, "capture_intake-id")
  assert.equal(audit.payload.action, "create_capture_intake")
})

test("upsertTask updates existing tasks and logs audit event", async () => {
  const supabase = createFakeSupabase()
  const id = await writes.upsertTask(context(supabase), {
    taskId: "task-1",
    text: "Call advisor",
    priority: "high",
    dueDate: "2026-06-23",
    projectId: "project-1",
    domainId: "domain-1",
    slipping: true,
  })

  assert.equal(id, "task-1")

  const update = supabase.calls.find(
    (call) => call.table === "tasks" && call.method === "update",
  )
  assert.equal(update.payload.text, "Call advisor")
  assert.equal(update.payload.priority, "high")
  assert.equal(update.payload.due_date, "2026-06-23")
  assert.equal(update.payload.project_id, "project-1")
  assert.equal(update.payload.domain_id, "domain-1")
  assert.equal(update.payload.slipping, true)

  const audit = supabase.calls.find(
    (call) => call.table === "agent_events" && call.method === "insert",
  )
  assert.equal(audit.payload.action, "upsert_task")
  assert.equal(audit.payload.target_id, "task-1")
})

test("MVP helper exports cover Hermes local write contract", () => {
  for (const helperName of [
    "logAgentEvent",
    "withAudit",
    "createCaptureIntake",
    "upsertTask",
    "writeBrief",
    "writeBoardRecommendation",
    "logDecision",
    "createSchoolItem",
  ]) {
    assert.equal(typeof writes[helperName], "function", helperName)
  }
})

test("write helpers insert expected MVP tables", async () => {
  const supabase = createFakeSupabase()
  const ctx = context(supabase)

  await writes.writeBrief(ctx, {
    summary: "Daily brief",
    topPriorities: ["Study"],
    risks: ["Deadline"],
    nextActions: ["Open LMS"],
  })
  await writes.writeBoardRecommendation(ctx, {
    agentName: "Hermes",
    title: "Protect focus block",
    summary: "Keep morning clear",
    recommendationType: "priority",
  })
  await writes.logDecision(ctx, {
    title: "Pick study system",
    urgency: "high",
  })
  await writes.createSchoolItem(ctx, {
    itemType: "assignment",
    title: "Submit form",
  })

  const insertedTables = supabase.calls
    .filter((call) => call.method === "insert")
    .map((call) => call.table)

  assert.deepEqual(
    insertedTables.filter((table) => table !== "agent_events"),
    [
      "assistant_briefs",
      "board_recommendations",
      "decisions",
      "school_items",
    ],
  )
  assert.equal(
    insertedTables.filter((table) => table === "agent_events").length,
    4,
  )
})
