# Today Earth Aurora Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain Today header with the approved vibrant Earth-only aurora hero and active starfield.

**Architecture:** Keep the hero isolated in one client component. Reuse existing Today Home data props and actions. Put animation primitives in global CSS because Tailwind v4 global CSS is already the app styling entrypoint.

**Tech Stack:** Next.js 16 App Router, React 19.2, Tailwind CSS v4, shadcn-style Button, lucide-react, local public image asset.

## Global Constraints

- Use Today Home source as truth; do not revive old Neon/Vercel UI.
- Use the approved B direction: vibrant purple-blue aurora, Earth only, no moon.
- Keep starfield animated but subtle; respect reduced motion.
- Preserve `onOpenInbox`, `onRunHermes`, assistant loading, and Hermes freshness status.
- Do not hide tasks too far down on mobile.
- Keep radius at or below 16px.
- No broad dashboard refactor.

---

### Task 1: Asset and Hero Component

**Files:**
- Copy: `.superpowers/brainstorm/25089-1782691876/content/earth-only-vibrant.png` to `public/today-earth-aurora.png`
- Create: `components/today-home/today-hero.tsx`

**Interfaces:**
- Consumes: `AssistantFreshness`, `FocusPressure`, `formatFocusMinutes`
- Produces: `TodayHero(props)` with `dateLabel`, `inboxCount`, `taskCount`, `pressure`, `assistantFreshness`, `assistantRunning`, `onOpenInbox`, `onRunHermes`

- [ ] Copy the approved generated image into `public/today-earth-aurora.png`.
- [ ] Create `TodayHero` as a client component using `next/image` with `fill`, `priority`, and `/today-earth-aurora.png`.
- [ ] Render date, personal welcome, pressure pill, Hermes freshness pill, Inbox button, Run Hermes button, and two compact metric tiles.
- [ ] Keep labels readable on dark aurora overlay and keep buttons usable on mobile.

### Task 2: Motion CSS

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `.today-hero-stars`, `.today-hero-ambient`
- Produces: reduced-motion-safe star drift and aurora breathing animations

- [ ] Add keyframes for star drift and ambient aurora.
- [ ] Add `.today-hero-stars` and `.today-hero-ambient`.
- [ ] Add `prefers-reduced-motion: reduce` fallback disabling animation.

### Task 3: Wire Today Home

**Files:**
- Modify: `components/today-home/today-home-view.tsx`

**Interfaces:**
- Consumes: `TodayHero`
- Produces: header replaced by hero with unchanged Today Home behavior

- [ ] Import `TodayHero`.
- [ ] Remove unused `Inbox`, `Loader2`, `Sparkles`, and `formatFocusMinutes` imports from `TodayHomeView`.
- [ ] Replace header block with `TodayHero`.
- [ ] Pass `taskCount={tasks.length}` and existing action/freshness props.

### Task 4: Verification

**Files:**
- Verify: affected TSX, CSS, app build

**Interfaces:**
- Produces: known local status before commit

- [ ] Run `npx eslint components/today-home/today-home-view.tsx components/today-home/today-hero.tsx`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start dev server and browser-smoke desktop/mobile: home renders Earth hero, starfield moves, buttons visible, tasks still reachable.

