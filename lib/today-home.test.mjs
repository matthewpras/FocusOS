import test from "node:test"
import assert from "node:assert/strict"

const todayHome = await import("./today-home.ts")

test("getTodayTasks returns incomplete tasks due today before unscheduled tasks", () => {
  const tasks = [
    { id: "done", text: "Done", completed: true, due_date: "2026-06-21", priority: "high" },
    { id: "late", text: "Late", completed: false, due_date: "2026-06-20", priority: "medium" },
    { id: "today", text: "Today", completed: false, due_date: "2026-06-21", priority: "medium" },
    { id: "none", text: "No date", completed: false, due_date: null, priority: "low" },
  ]

  assert.deepEqual(
    todayHome.getTodayTasks(tasks, new Date("2026-06-21T12:00:00-04:00")).map((task) => task.id),
    ["late", "today", "none"],
  )
})

test("buildCompactCalendarDays creates five days with matching commitments", () => {
  const commitments = [
    {
      id: "a",
      title: "Deep Work",
      starts_at: "2026-06-21T13:00:00.000Z",
      due_date: null,
      source: "google_calendar",
    },
    {
      id: "b",
      title: "School Review",
      starts_at: "2026-06-23T17:00:00.000Z",
      due_date: null,
      source: "google_calendar",
    },
  ]

  const days = todayHome.buildCompactCalendarDays(
    commitments,
    new Date("2026-06-21T12:00:00-04:00"),
  )

  assert.equal(days.length, 5)
  assert.equal(days[0].label, "Sun")
  assert.deepEqual(days[0].events.map((event) => event.title), ["Deep Work"])
  assert.deepEqual(days[2].events.map((event) => event.title), ["School Review"])
})

test("getScheduleRows uses upcoming calendar commitments in time order", () => {
  const rows = todayHome.getScheduleRows([
    { id: "gmail", title: "Email", starts_at: null, source: "gmail" },
    { id: "late", title: "Later", starts_at: "2026-06-21T19:00:00.000Z", source: "google_calendar" },
    { id: "early", title: "Earlier", starts_at: "2026-06-21T14:00:00.000Z", source: "google_calendar" },
  ])

  assert.deepEqual(rows.map((row) => row.id), ["early", "late"])
  assert.equal(rows[0].timeLabel, "10:00 AM")
})

test("calculateFocusPressureScore rises with overdue tasks and tight calendar", () => {
  const low = todayHome.calculateFocusPressureScore({
    overdueTaskCount: 0,
    todayTaskCount: 2,
    eventCount: 1,
    inboxCount: 0,
  })
  const high = todayHome.calculateFocusPressureScore({
    overdueTaskCount: 3,
    todayTaskCount: 7,
    eventCount: 5,
    inboxCount: 6,
  })

  assert.equal(low.label, "Low Focus Pressure")
  assert.equal(high.label, "High Focus Needed")
  assert.ok(high.score > low.score)
  assert.ok(high.availableFocusMinutes < low.availableFocusMinutes)
})

test("getAssistantFreshness marks old assistant runs as stale", () => {
  const freshness = todayHome.getAssistantFreshness(
    {
      last_successful_run_at: "2026-06-20T16:46:45.321Z",
      last_attempted_run_at: "2026-06-20T16:46:45.322Z",
      status: "success",
    },
    new Date("2026-06-28T12:00:00-04:00"),
  )

  assert.equal(freshness.state, "stale")
  assert.equal(freshness.label, "Hermes stale")
  assert.match(freshness.detail, /Last successful run Jun 20/)
})

test("getAssistantFreshness keeps recent assistant runs healthy", () => {
  const freshness = todayHome.getAssistantFreshness(
    {
      last_successful_run_at: "2026-06-28T14:30:00.000Z",
      last_attempted_run_at: "2026-06-28T14:30:00.000Z",
      status: "success",
    },
    new Date("2026-06-28T12:00:00-04:00"),
  )

  assert.equal(freshness.state, "healthy")
  assert.equal(freshness.label, "Hermes current")
})
