# Today Earth Aurora Hero Design

## Goal

Replace the plain Today header with a personal, premium welcome hero for FocusOS Today Home.

The hero should feel calm and alive: midnight navy, purple-blue aurora, colored Earth on the right, and a live starfield animation. It should keep the app usable as an operating cockpit, not become a marketing splash.

## Chosen Direction

Use the selected **Earth-only Active Starfield** direction:

- Vibrant purple-blue aurora background.
- Colored Earth as the only celestial body.
- No moon, no flat circles, no decorative dot graphics.
- Dark left side for readable welcome text.
- Active but subtle starfield animation over the background.
- Personal copy: morning/date greeting plus a short operational prompt.

## Hero Content

The hero replaces the current bordered white header in `TodayHomeView`.

It should show:

- Date line.
- Personal welcome headline.
- Short status sentence.
- Focus pressure pill.
- Hermes freshness pill.
- Inbox button.
- Run Hermes button.
- Two compact metric tiles for readiness/focus time and task/inbox context.

Existing actions stay wired:

- `onOpenInbox`
- `onRunHermes`
- assistant running loading state

## Visual Rules

- Use the generated Earth aurora image as a real raster asset.
- Keep text contrast strong against the left-side dark overlay.
- Border radius max: `16px`.
- No glass-card pileup.
- No gradient text.
- No decorative CSS circles/dots.
- Motion must have `prefers-reduced-motion` fallback.
- Hero must fit mobile without hiding Today tasks too far down.

## Motion

Add one CSS animation layer:

- Starfield overlay slowly drifts across the hero.
- Motion duration around `18s`.
- Reduced motion disables drift and leaves static stars.

Do not animate layout, buttons, or text.

## Files To Touch

- `components/today-home/today-home-view.tsx`
- `app/globals.css`
- `public/today-earth-aurora.png`

Possible new component if cleaner:

- `components/today-home/today-hero.tsx`

## Verification

Run:

- focused ESLint on touched files
- `npm test`
- browser check at desktop width
- browser check at mobile width

Confirm:

- hero renders image
- starfield moves unless reduced motion is enabled
- text remains readable
- buttons still work
- page does not route to old Vercel pages
- task list stays visible below hero without excessive scroll
