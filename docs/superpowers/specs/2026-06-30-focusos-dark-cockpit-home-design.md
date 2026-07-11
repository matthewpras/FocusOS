# FocusOS Dark Cockpit Home Design

## Goal

Make the Today home feel like one dark operational cockpit instead of a space banner above pale dashboard cards, while keeping mobile safe and reducing inbox noise.

## Scope

- Convert Today home panels and rail to the existing space/navy visual system.
- Add subtle live motion: star drift, glow/pulse, hover/press transitions, and reduced-motion fallbacks.
- Treat Today Inbox count as priority Gmail signals only, sourced from `external_commitments.source === "gmail"`.
- Leave quick capture available, but stop using captures as notification/inbox pressure.
- Show an empty/pending priority inbox state until Hermes Gmail access populates school-flagged messages.

## Non-Goals

- No 3D earth, canvas particles, heavy parallax, or page-load choreography.
- No Gmail API wiring in this pass.
- No broad navigation or database schema changes.

## Architecture

Theme tokens live in `app/globals.css`. Today home owns the cockpit wrapper and hero motion. Existing Today subcomponents consume `--today-*` tokens, so token changes plus focused class updates carry the dark theme through calendar, task, and schedule surfaces.

Inbox semantics are centralized with a small helper in `lib/today-home.ts`, covered by `lib/today-home.test.mjs`, then wired in `app/page.tsx`.

## Verification

- `npm test`
- `npm run lint`
- `npm run build`
- Browser check on desktop and mobile viewport for dark cockpit, motion sanity, and no text overflow.
