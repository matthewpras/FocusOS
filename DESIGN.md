# FocusOS Design Context

FocusOS should look and behave like a calm operational system: quiet, precise, low-friction, and trustworthy.

## Direction

- Product surface first. No landing-page composition.
- Dark interface with restrained contrast and sparse accent color.
- Dense but breathable panels. Optimize scanning, not spectacle.
- Mobile is first-class. Every core action must remain reachable on iPhone width.
- Visual hierarchy should answer: what changed, what matters now, what action follows?

## Existing Stack

- Next.js App Router.
- Tailwind CSS v4 tokens in `app/globals.css`.
- shadcn-style components in `components/ui`.
- Geist Sans and Geist Mono.
- lucide-react icons.
- Impeccable installed project-local under `.agents/skills/impeccable`.

## Palette

- Background: near-black neutral, not pure black.
- Surface: slightly lifted neutral cards/panels.
- Text: high-contrast foreground for primary labels; muted foreground only for secondary metadata.
- Accents: blue for active/workflow signals, violet for habit/assistant emphasis, destructive only for real risk.
- Avoid broad purple/blue gradients, decorative glow fields, and one-note monochrome screens.

## Layout Rules

- Prefer command-center density over oversized hero sections.
- Cards are for real repeated modules: tasks, calendar, habits, captures, assistant summary.
- Do not nest cards inside cards.
- Keep panel radius at or below current token scale unless component pattern requires more.
- Stable component dimensions for dashboards, tile grids, toolbar controls, counters, and mobile nav.
- Text must not overflow buttons, cards, tiles, or mobile containers.

## Component Rules

- Use existing `components/ui` primitives before adding new dependencies.
- Use lucide icons for tool/action buttons.
- Use buttons for commands, toggles/checkboxes for binary states, tabs for view modes, menus for option sets.
- Empty, loading, offline, auth, and sync-error states need designed behavior before shipping.
- Prefer explicit actionable copy over vague AI/productivity language.

## Motion

- Use motion to clarify transitions, not decorate.
- No bounce/elastic easing for core flows.
- Keep drag/reorder feedback obvious and low drama.

## Impeccable Workflow

- Use `/impeccable shape` before new UI surface work.
- Use `/impeccable audit` before calling UI work complete.
- Use `/impeccable harden` for mobile, overflow, empty state, error state, and auth/sync edge cases.
- Use `/impeccable quieter` if interface starts feeling ornamental.
- Use `/impeccable polish` before shipping significant screens.
