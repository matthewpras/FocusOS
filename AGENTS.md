<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FocusOS Agent Guide

## Mission
FocusOS is Matthew’s operational source of truth.

It should be the place where:
- work is captured fast
- projects and tasks are tracked cleanly
- priorities are obvious
- blockers are surfaced early
- next actions are visible
- Hermes can monitor operations and coordinate execution

FocusOS is not just a dashboard. It is the command center for Matthew’s work, revenue efforts, school transition, and personal operations.

## Product Standard
Every meaningful feature should improve at least one of these:
- capture speed
- clarity of priorities
- execution follow-through
- blocker visibility
- review quality
- mobile usability
- sync reliability
- revenue support
- reduced stress

If a feature does not improve execution, visibility, coordination, or reliability, question it.

## Strategic Context
Design with these realities in mind:
- Matthew wants FocusOS to be the place where all work lives.
- Hermes should be able to use it as the main operational cockpit.
- The system must stay usable during pharmacy school.
- Mobile matters because Matthew needs to run life from iPhone/Mac.
- Near-term usefulness matters more than abstract completeness.

## Workflow Doctrine
Assume the desired operating loop is:
1. capture incoming tasks, ideas, and obligations quickly
2. triage them into the right project, lane, or status
3. show the true next actions
4. surface blockers, overdue items, and stalled work
5. make review easy for both Hermes and Matthew
6. keep the dashboard legible, actionable, and trustworthy

The product should help Hermes cut through noise, automate friction, and maximize execution velocity.

## Implementation Bias
Prefer:
- one clean workflow over many partial ones
- boring reliability over clever fragility
- simple views with real leverage over flashy UI
- small reversible changes over broad speculative refactors
- features that reduce management overhead
- mobile-safe changes that preserve fast daily use

Be skeptical of:
- ornamental dashboards
- duplicated views without a clear job
- high-maintenance features
- architecture bloat
- anything that looks impressive but does not improve real usage

## Constraint Discipline
Always identify the binding constraint behind a proposed change when possible:
- time
- attention
- mobile usability
- auth/security
- sync reliability
- implementation complexity
- maintenance burden
- revenue impact
- overhead cost

When tradeoffs appear, favor:
1. long-term upside
2. reduced stress
3. revenue support
4. reliability
5. simplicity
6. speed
7. lower overhead costs

## Technical Guardrails
- Respect the current Next.js version and verify assumptions against local docs when behavior is unclear.
- Do not assume older Next.js patterns still apply.
- Do not break mobile layouts while improving desktop views.
- Preserve production-safe behavior for cloud environments.
- Obsidian/file-system features must degrade safely outside local environments.
- Auth, RLS, and data safety outrank cosmetic enhancements.
- Prefer changes that are easy to verify and easy to roll back.

## Agent Behavior In This Repo
- Be direct and implementation-focused.
- Do not overexplain simple things unless asked.
- Do not drift into generic product advice.
- Do not become an administrative bottleneck.
- Do not overengineer.
- If the user starts drifting toward lower-value work, flag the pivot and restate the primary constraint.
- If a change does not clearly improve FocusOS as an operating system for Matthew, push back.
- Deliver concrete, high-quality artifacts.

## Verification
Before calling work complete, verify as relevant:
- `npm run lint`
- `npm run build`
- affected browser flows
- mobile layout impact when UI changes are involved
- local vs cloud behavior for environment-sensitive features
- any auth/sync/file-system paths touched by the change
