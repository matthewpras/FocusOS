# FocusOS Dark Cockpit Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Today home into a dark, subtly animated cockpit and make Inbox count reflect priority Gmail signals only.

**Architecture:** Add a tested helper in `lib/today-home.ts` for priority inbox signals. Reuse existing Today components and CSS variables to restyle the home surface. Add CSS-only motion with reduced-motion fallback.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS v4, shadcn-style UI, lucide-react.

---

### Task 1: Priority Inbox Semantics

**Files:**
- Modify: `lib/today-home.test.mjs`
- Modify: `lib/today-home.ts`
- Modify: `app/page.tsx`

- [ ] Add a failing test that only Gmail commitments count as priority inbox signals.
- [ ] Run `npm test -- lib/today-home.test.mjs` and confirm the new helper is missing.
- [ ] Add `getPriorityInboxSignals()` to `lib/today-home.ts`.
- [ ] Wire `app/page.tsx` so Today count and pressure use priority Gmail signals, not captures.
- [ ] Re-run `npm test -- lib/today-home.test.mjs`.

### Task 2: Dark Cockpit Theme

**Files:**
- Modify: `app/globals.css`
- Modify: `components/today-home/today-home-view.tsx`
- Modify: `components/today-home/compact-week-calendar.tsx`
- Modify: `components/today-home/today-task-list.tsx`
- Modify: `components/today-home/schedule-rail.tsx`
- Modify: `components/today-home/dark-today-sidebar.tsx`

- [ ] Update Today tokens to dark navy surfaces, luminous borders, high-contrast text, and calm muted labels.
- [ ] Restore large hero treatment in `TodayHomeView` with dark space background and priority inbox metric.
- [ ] Restyle calendar, task list, schedule rail, pressure ring, and sidebar against dark tokens.
- [ ] Keep quick capture and command actions reachable on mobile.

### Task 3: Subtle Motion

**Files:**
- Modify: `app/globals.css`
- Modify: `components/today-home/today-home-view.tsx`

- [ ] Add `focusos-star-drift`, `focusos-orbit-glow`, and `focusos-status-pulse` keyframes.
- [ ] Add `prefers-reduced-motion: reduce` overrides.
- [ ] Apply motion only to decorative hero layers and status badges.

### Task 4: Verification

**Files:**
- Test: app and browser

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Start dev server and verify desktop plus mobile in browser.
