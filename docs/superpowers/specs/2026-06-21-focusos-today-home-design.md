# FocusOS Today Home Design

## Feature Summary

FocusOS home becomes a Today-first operating surface. It keeps the task clarity of a native planner, adds a dark command-oriented sidebar, and uses a compact calendar as the main time-pressure graphic.

The screen is for Matthew during daily execution and for Hermes as an operator sidecar. It should answer three questions quickly: what does today look like, what needs action next, and where is pressure building?

## Primary User Action

Matthew should open FocusOS, understand the day's pressure in seconds, then start or complete the next task without navigating away.

## Design Direction

- **Visual lane:** Things-style readability plus Raycast command speed plus Notion Calendar content structure.
- **Theme:** Cool Mist main surface with a dark graphite sidebar.
- **Color strategy:** Restrained. Blue is the primary action/current-selection color. Project colors appear only in compact calendar blocks and project markers.
- **Typography:** Native Apple-like sans-serif, fixed product scale, no display typography.
- **Material:** Thin dividers, flat surfaces, light blue-gray app background, white content panes, graphite command overlay.
- **Anti-goals:** No dark bento dashboard, no decorative glow, no nested cards, no oversized focus hero block, no full white blank canvas.

## Scope

- **Fidelity:** Production-ready UI direction.
- **Breadth:** Home page redesign only.
- **Interactivity:** Shipped-quality responsive page with a command palette shell. The first implementation wires commands to existing safe actions only: quick capture, run Hermes, and open Inbox.
- **Time intent:** Build a usable Today surface first, then layer deeper Hermes and capture workflows.

## Layout Strategy

The page follows the approved reference composition:

- Dark graphite sidebar on the left with Today, Inbox, Upcoming, Anytime, Someday, Logbook, projects, and settings.
- Main content on a Cool Mist background.
- Header row with Today title, date, and focus-pressure score.
- Compact weekly calendar replaces the previous large focus block.
- Task list stays central below the calendar.
- Right rail keeps schedule context and pressure signals.
- Raycast-style command palette appears as a bottom-right overlay when invoked.

The hierarchy should read:

1. Today + pressure
2. Compact calendar context
3. Tasks due today
4. Schedule rail
5. Command actions

## Key States

- **Default:** Calendar populated, tasks listed, schedule rail visible, pressure score shown.
- **Empty calendar:** Show open day blocks and a prompt to add or sync commitments.
- **Empty tasks:** Keep calendar visible and show one inline action to capture or plan next work.
- **Loading:** Skeleton rows for calendar blocks, tasks, and schedule rail. No centered spinner.
- **Error:** Inline sync warning in the affected surface, not a modal.
- **High pressure:** Red pressure label and ring in header. Keep it compact.
- **Low pressure:** Neutral label with available focus time.
- **Mobile:** Sidebar collapses into the existing mobile navigation pattern. The compact weekly calendar becomes a horizontally scrollable five-day strip above tasks. The command trigger remains fixed in the bottom action area.

## Interaction Model

- Sidebar selection changes primary view.
- Calendar block click filters or reveals related tasks.
- Task checkbox completes the item inline. Task row navigation is omitted until a focused task detail surface exists.
- Command palette trigger opens bottom/right overlay on desktop and full-width sheet on mobile.
- `Run Hermes` and pressure actions stay available but should not dominate the page.
- Motion stays subtle: 150-200 ms state transitions, no page-load choreography.

## Content Requirements

Core labels:

- Today
- Inbox
- Upcoming
- Anytime
- Someday
- Logbook
- Projects
- Settings
- Calendar
- Tasks
- Schedule
- High Focus Needed
- available
- Type a command or search

Calendar blocks should show:

- time
- short title
- optional project or category

Task rows should show:

- title
- estimated duration or source note
- scheduled time when available

Pressure header should show:

- pressure label
- available focus time
- score out of 100

## Implementation Notes

- Prefer small focused components instead of growing `app/page.tsx`.
- Keep existing hooks for tasks, habits, captures, assistant, commitments, and tile order where useful.
- Current bento tiles should not drive the new home hierarchy.
- Reuse `components/ui` primitives for buttons, badges, sheets, dialogs, separators, and tooltips.
- Keep OKLCH tokens in `app/globals.css`; add Cool Mist and graphite semantic tokens if needed.
- Use lucide icons for sidebar and commands.
- Do not commit `.superpowers` visual companion artifacts.

## Recommended Impeccable References

- `layout.md` for spacing, hierarchy, and responsive structure.
- `typeset.md` for native product typography.
- `colorize.md` for Cool Mist, graphite sidebar, and semantic project colors.
- `harden.md` for loading, error, empty, and mobile states.
- `polish.md` before shipping the final home page.

## Resolved Defaults

- Mobile calendar uses a horizontal five-day strip, not a stacked agenda.
- Command palette v1 wires only existing safe actions: quick capture, run Hermes, and open Inbox.
- Task detail navigation is out of scope for this home redesign.
