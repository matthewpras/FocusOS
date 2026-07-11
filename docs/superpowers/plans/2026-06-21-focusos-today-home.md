# FocusOS Today Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark bento home page with the approved Today-focused home: dark graphite sidebar, Cool Mist main surface, compact weekly calendar, central task list, schedule rail, pressure score, and Raycast-style command palette.

**Architecture:** Keep data derivation in pure helpers under `lib/` so behavior is testable before UI work. Split the home page into focused components under `components/today-home/` and keep `app/page.tsx` as the composition layer using existing hooks. Preserve existing auth/capture shell behavior while redesigning the home surface.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn-style local UI primitives, lucide-react, Playwright, Node test runner.

---

## File Structure

- Create `lib/today-home.ts`: pure functions for dates, pressure score, compact calendar days, schedule rows, and task filtering.
- Create `lib/today-home.test.mjs`: Node tests for pressure scoring, calendar day generation, schedule extraction, and task filtering.
- Create `components/today-home/today-home-view.tsx`: high-level presentational Today home layout.
- Create `components/today-home/dark-today-sidebar.tsx`: dark graphite sidebar used by the new home layout.
- Create `components/today-home/compact-week-calendar.tsx`: five-day compact calendar strip.
- Create `components/today-home/today-task-list.tsx`: central task list with inline completion.
- Create `components/today-home/schedule-rail.tsx`: right-side schedule/pressure rail.
- Create `components/today-home/command-palette-shell.tsx`: Raycast-style command overlay with safe v1 actions.
- Modify `app/page.tsx`: remove bento grid composition and compose the new Today home.
- Modify `app/globals.css`: add Cool Mist, graphite, and Today semantic tokens.
- Modify `tests/e2e/focusos.smoke.spec.ts`: update smoke assertions for new Today home.

---

### Task 1: Add Tested Today Data Helpers

**Files:**
- Create: `lib/today-home.ts`
- Create: `lib/today-home.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `lib/today-home.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test lib/today-home.test.mjs`

Expected: FAIL with module not found for `./today-home.ts`.

- [ ] **Step 3: Implement `lib/today-home.ts`**

Create `lib/today-home.ts`:

```ts
import { addDays, format, isSameDay, parseISO } from "date-fns"

type TaskLike = {
  id: string
  text?: string
  title?: string
  completed?: boolean | null
  due_date?: string | null
  priority?: string | null
}

type CommitmentLike = {
  id: string
  title: string
  starts_at?: string | null
  due_date?: string | null
  source?: string | null
}

export type CompactCalendarEvent = {
  id: string
  title: string
  timeLabel: string
  tone: "blue" | "violet" | "green" | "amber"
}

export type CompactCalendarDay = {
  date: Date
  label: string
  dayNumber: string
  events: CompactCalendarEvent[]
}

export type ScheduleRow = {
  id: string
  title: string
  timeLabel: string
  note: string
}

export type FocusPressure = {
  score: number
  label: "Low Focus Pressure" | "Moderate Focus Pressure" | "High Focus Needed"
  availableFocusMinutes: number
}

function dateKey(value: Date) {
  return format(value, "yyyy-MM-dd")
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = value.includes("T") ? parseISO(value) : parseISO(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function eventTone(index: number): CompactCalendarEvent["tone"] {
  return (["blue", "violet", "green", "amber"] as const)[index % 4]
}

export function getTodayTasks<T extends TaskLike>(tasks: T[], now = new Date()): T[] {
  const today = dateKey(now)

  return tasks
    .filter((task) => !task.completed)
    .filter((task) => !task.due_date || task.due_date <= today)
    .sort((a, b) => {
      const aDue = a.due_date ?? "9999-12-31"
      const bDue = b.due_date ?? "9999-12-31"
      if (aDue !== bDue) return aDue.localeCompare(bDue)
      return String(a.text ?? a.title ?? "").localeCompare(String(b.text ?? b.title ?? ""))
    })
}

export function buildCompactCalendarDays(
  commitments: CommitmentLike[],
  now = new Date(),
): CompactCalendarDay[] {
  return Array.from({ length: 5 }, (_, dayIndex) => {
    const date = addDays(now, dayIndex)
    const events = commitments
      .filter((item) => item.source === "google_calendar" && Boolean(item.starts_at))
      .filter((item) => {
        const startsAt = parseDate(item.starts_at)
        return startsAt ? isSameDay(startsAt, date) : false
      })
      .slice(0, 3)
      .map((item, eventIndex) => ({
        id: item.id,
        title: item.title,
        timeLabel: format(parseDate(item.starts_at) ?? date, "h:mm a"),
        tone: eventTone(dayIndex + eventIndex),
      }))

    return {
      date,
      label: format(date, "EEE"),
      dayNumber: format(date, "d"),
      events,
    }
  })
}

export function getScheduleRows(commitments: CommitmentLike[]): ScheduleRow[] {
  return commitments
    .filter((item) => item.source === "google_calendar" && Boolean(item.starts_at))
    .map((item) => ({
      item,
      startsAt: parseDate(item.starts_at),
    }))
    .filter((entry): entry is { item: CommitmentLike; startsAt: Date } => Boolean(entry.startsAt))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 5)
    .map(({ item, startsAt }) => ({
      id: item.id,
      title: item.title,
      timeLabel: format(startsAt, "h:mm a"),
      note: "Calendar commitment",
    }))
}

export function calculateFocusPressureScore(input: {
  overdueTaskCount: number
  todayTaskCount: number
  eventCount: number
  inboxCount: number
}): FocusPressure {
  const score = Math.min(
    100,
    20 +
      input.overdueTaskCount * 16 +
      input.todayTaskCount * 5 +
      input.eventCount * 7 +
      input.inboxCount * 4,
  )
  const availableFocusMinutes = Math.max(30, 260 - score * 2)
  const label =
    score >= 60
      ? "High Focus Needed"
      : score >= 40
        ? "Moderate Focus Pressure"
        : "Low Focus Pressure"

  return { score, label, availableFocusMinutes }
}

export function formatFocusMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (!hours) return `${remaining}m`
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `node --experimental-strip-types --test lib/today-home.test.mjs`

Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/today-home.ts lib/today-home.test.mjs
git commit -m "test: add today home data helpers"
```

---

### Task 2: Add Today Theme Tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add semantic tokens**

Add these under both `:root` and `.dark`, using identical values because the approved Today surface is intentionally light with a dark sidebar:

```css
  --today-bg: oklch(0.94 0.014 244);
  --today-surface: oklch(1 0 0);
  --today-sidebar: oklch(0.18 0.017 255);
  --today-sidebar-muted: oklch(0.7 0.023 254);
  --today-ink: oklch(0.22 0.014 255);
  --today-muted: oklch(0.48 0.02 253);
  --today-line: oklch(0.88 0.012 252);
  --today-blue: oklch(0.57 0.21 260);
  --today-red: oklch(0.64 0.2 25);
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: add today home theme tokens"
```

---

### Task 3: Build Presentational Today Home Components

**Files:**
- Create: `components/today-home/today-home-view.tsx`
- Create: `components/today-home/dark-today-sidebar.tsx`
- Create: `components/today-home/compact-week-calendar.tsx`
- Create: `components/today-home/today-task-list.tsx`
- Create: `components/today-home/schedule-rail.tsx`
- Create: `components/today-home/command-palette-shell.tsx`

- [ ] **Step 1: Create component directory**

Run: `mkdir -p components/today-home`

Expected: directory exists.

- [ ] **Step 2: Create `dark-today-sidebar.tsx`**

Implement a dark graphite sidebar with lucide icons: `Inbox`, `CalendarDays`, `CheckCircle2`, `Archive`, `BookOpen`, `Settings`, `Plus`, `Circle`, `Home`.

Required props:

```ts
type DarkTodaySidebarProps = {
  inboxCount: number
  projectCounts?: { work?: number; health?: number; learning?: number; personal?: number; finance?: number; home?: number }
}
```

Use labels exactly: Today, Inbox, Upcoming, Anytime, Someday, Logbook, Projects, Work, Health, Learning, Personal, Finance, Home, New Project, Settings.

- [ ] **Step 3: Create `compact-week-calendar.tsx`**

Props:

```ts
import type { CompactCalendarDay } from "@/lib/today-home"

type CompactWeekCalendarProps = {
  days: CompactCalendarDay[]
  onSelectEvent?: (id: string) => void
}
```

Render a five-column strip on desktop and a horizontal scroll strip on mobile. Use tones: blue, violet, green, amber. Empty day copy: `Open`.

- [ ] **Step 4: Create `today-task-list.tsx`**

Props:

```ts
import type { Task } from "@/types"

type TodayTaskListProps = {
  tasks: Task[]
  onComplete: (task: Task) => void
}
```

Render circular check controls, task text, category/duration metadata if present, and due time when available. Empty state: `No tasks need attention yet. Capture one next action to protect the day.`

- [ ] **Step 5: Create `schedule-rail.tsx`**

Props:

```ts
import type { FocusPressure, ScheduleRow } from "@/lib/today-home"

type ScheduleRailProps = {
  pressure: FocusPressure
  scheduleRows: ScheduleRow[]
}
```

Render pressure label, available focus time, score ring, and schedule rows. Empty schedule copy: `No calendar commitments found for the next window.`

- [ ] **Step 6: Create `command-palette-shell.tsx`**

Props:

```ts
type CommandPaletteShellProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuickCapture: () => void
  onRunHermes: () => void
  onOpenInbox: () => void
}
```

Use `Dialog` or `Sheet` from local UI if appropriate. Desktop style should be bottom-right graphite overlay; mobile should be full-width bottom sheet. Commands: Quick capture, Run Hermes, Open Inbox.

- [ ] **Step 7: Create `today-home-view.tsx`**

Props:

```ts
import type { CompactCalendarDay, FocusPressure, ScheduleRow } from "@/lib/today-home"
import type { Task } from "@/types"

type TodayHomeViewProps = {
  inboxCount: number
  days: CompactCalendarDay[]
  tasks: Task[]
  pressure: FocusPressure
  scheduleRows: ScheduleRow[]
  assistantRunning: boolean
  onCompleteTask: (task: Task) => void
  onQuickCapture: () => void
  onRunHermes: () => void
  onOpenInbox: () => void
}
```

Compose dark sidebar, header, compact calendar, task list, schedule rail, and command palette. Do not use `BentoTile`.

- [ ] **Step 8: Run lint**

Run: `npm run lint`

Expected: PASS with no errors.

- [ ] **Step 9: Commit**

```bash
git add components/today-home
git commit -m "feat: add today home components"
```

---

### Task 4: Wire Home Page to New Components

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace bento composition**

Refactor `app/page.tsx` to:

- keep existing hooks: `useAuth`, `useTasks`, `useCaptures`, `useAssistant`, `useExternalCommitments`
- remove dnd tile layout
- derive values with `getTodayTasks`, `buildCompactCalendarDays`, `getScheduleRows`, `calculateFocusPressureScore`
- pass data into `TodayHomeView`
- wire complete task to `tasks.updateTask(task.id, { completed: true })`
- wire quick capture to existing capture affordance by dispatching a custom event:

```ts
window.dispatchEvent(new CustomEvent("focusos:open-capture"))
```

If `CaptureFAB`/`CaptureModal` does not currently listen to that event, add that listener in Task 5 instead of inventing a second modal.

- [ ] **Step 2: Run focused tests**

Run: `node --experimental-strip-types --test lib/today-home.test.mjs`

Expected: PASS all tests.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire today home page"
```

---

### Task 5: Wire Safe Command Actions

**Files:**
- Modify: `components/capture-fab.tsx`
- Modify: `components/capture-modal.tsx` if capture open state is owned there instead of FAB
- Modify: `components/today-home/command-palette-shell.tsx` if needed

- [ ] **Step 1: Inspect capture open-state ownership**

Read `components/capture-fab.tsx` and `components/capture-modal.tsx`.

Expected: identify where the modal open state lives.

- [ ] **Step 2: Add event listener for quick capture**

Add support for:

```ts
window.addEventListener("focusos:open-capture", openCapture)
```

Cleanup on unmount. Keep existing FAB behavior unchanged.

- [ ] **Step 3: Wire command actions**

Command palette actions:

- Quick capture: opens capture modal.
- Run Hermes: invokes existing `assistant.runNow`.
- Open Inbox: route to `/capture`.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: PASS with no errors.

- [ ] **Step 5: Commit**

```bash
git add components/capture-fab.tsx components/capture-modal.tsx components/today-home/command-palette-shell.tsx app/page.tsx
git commit -m "feat: wire today command actions"
```

---

### Task 6: Update Playwright Coverage

**Files:**
- Modify: `tests/e2e/focusos.smoke.spec.ts`

- [ ] **Step 1: Update smoke expectations**

Assert:

- heading `Today`
- text `Calendar`
- text `Tasks`
- text `Schedule`
- text `Type a command or search`
- no framework overlay

- [ ] **Step 2: Update mobile assertion**

Assert mobile viewport shows:

- `Today`
- `Calendar`
- `Tasks`

Keep screenshot assertion filename unchanged unless Playwright requires a new baseline after intentional redesign.

- [ ] **Step 3: Run visual snapshot update**

Run: `npm run test:visual`

Expected: PASS and update expected mobile screenshot.

- [ ] **Step 4: Run normal e2e**

Run: `npm run test:e2e`

Expected: PASS all tests.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/focusos.smoke.spec.ts tests/e2e/focusos.smoke.spec.ts-snapshots
git commit -m "test: update today home smoke coverage"
```

---

### Task 7: Final Verification and Impeccable Pass

**Files:**
- Modify only if verification reveals defects.

- [ ] **Step 1: Run core verification**

Run:

```bash
node --experimental-strip-types --test lib/today-home.test.mjs
npm run lint
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 2: Run Impeccable audit/polish**

Run:

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json app/page.tsx components/today-home app/globals.css
```

Expected: no high-severity slop findings. If detector reports actionable contrast, overflow, nested-card, glow, gradient-text, or over-rounded-card findings, fix them and rerun verification.

- [ ] **Step 3: Browser inspect**

Start dev server:

```bash
npm run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000` and verify:

- page renders nonblank
- dark sidebar visible on desktop
- Cool Mist main background visible
- compact calendar above task list
- schedule rail visible on desktop
- command palette opens
- mobile viewport does not overlap text or hide core actions

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add app/page.tsx app/globals.css components/today-home tests/e2e/focusos.smoke.spec.ts
git commit -m "fix: polish today home verification issues"
```

Skip this commit if Task 7 made no changes.

---

## Self-Review Notes

- Spec coverage: plan covers data helpers, Cool Mist/graphite theme, dark sidebar, compact calendar, tasks, schedule rail, command palette, mobile behavior, safe commands, verification.
- Placeholder scan: no incomplete-work markers or vague implementation gaps found.
- Type consistency: shared types come from `lib/today-home.ts` and are imported by components.
