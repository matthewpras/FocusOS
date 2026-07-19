import test from "node:test"
import assert from "node:assert/strict"

const reads = await import("./reads.ts")

function createFakeSupabase(tableData) {
  const calls = []

  function chain(table, data) {
    const result = {
      table,
      filters: {},
      eq(column, value) {
        calls.push({ table, method: "eq", column, value })
        result.filters[column] = value
        return result
      },
      not(column, operator, value) {
        calls.push({ table, method: "not", column, operator, value })
        return result
      },
      lte(column, value) {
        calls.push({ table, method: "lte", column, value })
        return result
      },
      order(column, options) {
        calls.push({ table, method: "order", column, options })
        return result
      },
      limit(count) {
        calls.push({ table, method: "limit", count })
        return result
      },
      async maybeSingle() {
        return { data: data[0] ?? null, error: null }
      },
      then(resolve) {
        return resolve({ data, error: null })
      },
    }
    return result
  }

  return {
    calls,
    from(table) {
      return {
        select(columns) {
          calls.push({ table, method: "select", columns })
          return chain(table, tableData[table] ?? [])
        },
      }
    },
  }
}

function context(supabase) {
  return { supabase, userId: "user-1" }
}

test("getOpenCaptures scopes to user and unconverted captures", async () => {
  const supabase = createFakeSupabase({ captures: [{ id: "c1" }] })
  const data = await reads.getOpenCaptures(context(supabase), 10)

  assert.deepEqual(data, [{ id: "c1" }])
  assert.ok(supabase.calls.some((c) => c.table === "captures" && c.method === "eq" && c.column === "user_id" && c.value === "user-1"))
  assert.ok(supabase.calls.some((c) => c.table === "captures" && c.method === "eq" && c.column === "converted" && c.value === false))
  assert.ok(supabase.calls.some((c) => c.table === "captures" && c.method === "limit" && c.count === 10))
})

test("getTasks filters by completed when provided", async () => {
  const supabase = createFakeSupabase({ tasks: [{ id: "t1" }] })
  const data = await reads.getTasks(context(supabase), { completed: false, limit: 5 })

  assert.deepEqual(data, [{ id: "t1" }])
  assert.ok(supabase.calls.some((c) => c.table === "tasks" && c.method === "eq" && c.column === "completed" && c.value === false))
  assert.ok(supabase.calls.some((c) => c.table === "tasks" && c.method === "limit" && c.count === 5))
})

test("getOpenTasksDueBy filters open tasks with a due date at or before the cutoff", async () => {
  const supabase = createFakeSupabase({ tasks: [{ id: "t1" }] })
  const data = await reads.getOpenTasksDueBy(context(supabase), "2026-07-20")

  assert.deepEqual(data, [{ id: "t1" }])
  assert.ok(supabase.calls.some((c) => c.table === "tasks" && c.method === "eq" && c.column === "completed" && c.value === false))
  assert.ok(supabase.calls.some((c) => c.table === "tasks" && c.method === "lte" && c.column === "due_date" && c.value === "2026-07-20"))
})

test("getLatestBrief returns the most recent brief or null", async () => {
  const supabase = createFakeSupabase({ assistant_briefs: [{ id: "b1" }] })
  const data = await reads.getLatestBrief(context(supabase))
  assert.deepEqual(data, { id: "b1" })

  const empty = createFakeSupabase({ assistant_briefs: [] })
  assert.equal(await reads.getLatestBrief(context(empty)), null)
})

test("getRecentAgentEvents and getOpenDecisions scope to user", async () => {
  const supabase = createFakeSupabase({
    agent_events: [{ id: "e1" }],
    decisions: [{ id: "d1" }],
  })

  assert.deepEqual(await reads.getRecentAgentEvents(context(supabase)), [{ id: "e1" }])
  assert.deepEqual(await reads.getOpenDecisions(context(supabase)), [{ id: "d1" }])
  assert.ok(supabase.calls.some((c) => c.table === "decisions" && c.method === "eq" && c.column === "status" && c.value === "open"))
})

test("getUpcomingCommitments scopes to user and google_calendar source", async () => {
  const supabase = createFakeSupabase({ external_commitments: [{ id: "ec1" }] })
  const data = await reads.getUpcomingCommitments(context(supabase), 5)

  assert.deepEqual(data, [{ id: "ec1" }])
  assert.ok(
    supabase.calls.some(
      (c) => c.table === "external_commitments" && c.method === "eq" && c.column === "source" && c.value === "google_calendar",
    ),
  )
  assert.ok(supabase.calls.some((c) => c.table === "external_commitments" && c.method === "limit" && c.count === 5))
})

test("read helper exports cover Hermes local read contract", () => {
  for (const helperName of [
    "getOpenCaptures",
    "getTasks",
    "getOpenTasksDueBy",
    "getLatestBrief",
    "getRecentAgentEvents",
    "getOpenDecisions",
    "getUpcomingCommitments",
  ]) {
    assert.equal(typeof reads[helperName], "function", helperName)
  }
})
