# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Web app that turns a **public Google Calendar iCal feed** into a clean, dark, shareable web calendar. The user pastes a public `.ics` URL on `/`, the app fetches + parses it server-side and renders a month-grid calendar showing only events. Longer-term goals (not built yet): styled Pokémon-themed icons/events, and deterrents against screenshotting/exporting the calendar image.

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

- **Nuxt 4** (Vue 3.5, Nitro server) + **Tailwind v4** + **PrimeVue 4** (buttons/inputs only) + **hand-written CSS** for the calendar grid. Dark mode is forced.
- **Nuxt 4 directory layout:** app code lives under `app/` (`app/app.vue`, `app/pages/`, `app/components/`, `app/assets/`). Server code under `server/`. Cross-cutting types under `shared/` (referenced as `~~/shared/...`).
- **Data flow (why Nuxt):** the browser never fetches the calendar directly (CORS + no API key). Instead:
  - `server/api/events.get.ts` — Nitro route. Takes `?url=`, normalizes `webcal://`→`https://`, fetches the `.ics` text, parses with **node-ical**, expands recurring events (`rrule.between`, honoring `exdate`) within a window (−6 / +18 months), and returns a flat `{ events: CalendarEvent[] }`.
  - `app/pages/index.vue` — URL input (PrimeVue) + `$fetch('/api/events')`, holds the event list, renders `<EventCalendar>`.
  - `app/components/EventCalendar.vue` — pure presentational month grid (Monday-first, 42 cells), groups events by local date, prev/next/today nav. All styling is scoped hand-written CSS.
- **Shared type:** `CalendarEvent` in `shared/types/event.ts` is the single contract between server route and UI.

## Theming / dark mode

- PrimeVue uses the **Aura** preset with `darkModeSelector: '.app-dark'`; the `app-dark` class is set on `<html>` via `nuxt.config.ts` `app.head.htmlAttrs`. PrimeVue styles are scoped to a `primevue` CSS layer (`theme, base, primevue` order) so Tailwind/our CSS can override predictably.
- App palette lives as CSS custom properties (`--app-bg`, `--app-surface`, `--app-accent`, …) in `app/assets/css/main.css`. The whole app is dark by design — **don't** rely on Tailwind `dark:` variants; use the dark palette directly.

## Conventions

- Vue components: PascalCase `.vue`, `<script setup lang="ts">`, Composition API.
- Prettier (`.prettierrc.json`): no semicolons, single quotes, width 100.
- All-day events depend on server/client sharing a timezone (single-user app); revisit if that assumption breaks.

## Notes / gotchas

- `@primevue/themes` is deprecated → this project uses **`@primeuix/themes`** (import `Aura` from `@primeuix/themes/aura`).
- The user wants **PrimeVue** (PrimeNG is Angular-only) for buttons/UI; calendar grid stays hand-rolled.
