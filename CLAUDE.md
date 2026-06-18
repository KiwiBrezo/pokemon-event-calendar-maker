# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Web app that turns a **public Google Calendar iCal feed** into a clean, dark, shareable web calendar. The user pastes a public `.ics` URL on `/`, the app fetches + parses it **in the browser** and renders a month-grid calendar showing only events. Longer-term goals (not built yet): styled Pokémon-themed icons/events, and deterrents against screenshotting/exporting the calendar image.

**Deployment:** built as a **static site** (`npm run generate`) served by **nginx** under the base path `/pokemon-event-calendar/`. Because Google Calendar feeds send no CORS headers, the browser fetches the `.ics` through a same-origin proxy path (`<base>/ical/**`) that nginx `proxy_pass`es to `calendar.google.com`. See `deploy/nginx.conf`.

## Commands

```sh
npm run dev          # Nuxt dev server (http://localhost:3000)
npm run build        # production build
npm run generate     # static generation
npm run preview      # serve the production build
npm run typecheck    # nuxt typecheck (vue-tsc)
npm run format       # Prettier over the repo
```

No test runner is configured yet.

## Stack & architecture

- **Nuxt 4** (Vue 3.5, static/SSG) + **Tailwind v4** + **PrimeVue 4** (buttons/inputs only) + **hand-written CSS** for the calendar grid. Dark mode is forced.
- **Nuxt 4 directory layout:** app code lives under `app/` (`app/app.vue`, `app/pages/`, `app/components/`, `app/composables/`, `app/assets/`). Cross-cutting types under `shared/` (referenced as `~~/shared/...`). `server/` is currently empty — there is no runtime server in the static deploy.
- **Data flow (client-side):** the feed is fetched + parsed entirely in the browser; the same-origin `<base>/ical/**` proxy (nginx in prod, a Nitro `routeRules` proxy in dev) only relays the raw `.ics` bytes from Google to dodge CORS.
  - `app/composables/useCalendarFeed.ts` — `fetchCalendarEvents(url)`: normalizes `webcal://`→`https://`, maps a Google `.ics` URL onto the same-origin `<base>/ical/...` path, `$fetch`es the text, parses with **ical.js**, expands recurring events (iterator honors `EXDATE`) within a window (−24 / +12 months). Returns `CalendarEvent[]`. Only `calendar.google.com` hosts are accepted (that's all the proxy forwards to).
  - `app/composables/useCalendar.ts` — **module-scoped shared state** (`url`, `events`, `loading`, `error`, `loadedUrl`) + `load()` / `ensureLoaded()`. Single source of truth shared by `/` and `/settings` across client-side nav; **in-memory only**, so a full page refresh resets it and the calendar reverts to the hardcoded default URL (`runtimeConfig.public.defaultCalendarUrl`).
  - `app/composables/useEventStyles.ts` — shared per-**store** color store (auto-assigned palette + manual overrides) and the default pill icon.
  - `app/pages/index.vue` — full-viewport calendar-only landing page; `onMounted(ensureLoaded)` auto-loads (default URL on first visit, or whatever settings set this session); a gear `NuxtLink` goes to `/settings`; shows a Pokémon-styled loading overlay while fetching.
  - `app/pages/settings.vue` — `/settings` route: edit the feed URL (draft → **Recreate** loads it then routes back to `/`) and per-store colors (preset swatches + `ColorPicker`).
  - `app/components/EventCalendar.vue` — month grid (Monday-first, 42 cells) that fills the page; groups events by local date; per-event color + tier-icon detection; click a pill to edit its store color. All styling is scoped hand-written CSS.
- **Shared type:** `CalendarEvent` in `shared/types/event.ts` is the single contract between the feed parser and the UI.

## Theming / dark mode

- PrimeVue uses the **Aura** preset with `darkModeSelector: '.app-dark'`; the `app-dark` class is set on `<html>` via `nuxt.config.ts` `app.head.htmlAttrs`. PrimeVue styles are scoped to a `primevue` CSS layer (`theme, base, primevue` order) so Tailwind/our CSS can override predictably.
- App palette lives as CSS custom properties (`--app-bg`, `--app-surface`, `--app-accent`, …) in `app/assets/css/main.css`. The whole app is dark by design — **don't** rely on Tailwind `dark:` variants; use the dark palette directly.

## Conventions

- Vue components: PascalCase `.vue`, `<script setup lang="ts">`, Composition API.
- Prettier (`.prettierrc.json`): no semicolons, single quotes, width 100.
- All-day / timed events are interpreted in the **viewer's** local timezone (ical.js `Time.toJSDate()`); fine for a single-user app, revisit if that assumption breaks.

## Notes / gotchas

- `@primevue/themes` is deprecated → this project uses **`@primeuix/themes`** (import `Aura` from `@primeuix/themes/aura`).
- The user wants **PrimeVue** (PrimeNG is Angular-only) for buttons/UI; calendar grid stays hand-rolled.
