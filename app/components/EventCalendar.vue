<script setup lang="ts">
import type { CalendarEvent } from '~~/shared/types/event'

const props = defineProps<{ events: CalendarEvent[] }>()

const { storeKey, colorFor, iconFor, isBigEvent } = useEventStyles()

/**
 * Event tiers, ordered most → least prestigious. The title is matched against
 * each pattern in this order, so a higher tier wins. Icon size + color escalate
 * with prestige (gold + large at the top, muted + small at the bottom).
 */
interface EventType {
  key: string
  label: string
  icon: string
  color: string
  /** Icon font-size in px — bigger = more prestige. */
  size: number
  match: RegExp
}

// Patterns matched against the title. Tolerant of the feed's quirks: trailing
// "s" (INTERNATIONALS/REGIONALS) and the recurring "CHALLANGE" typo.
const EVENT_TYPES: EventType[] = [
  { key: 'worlds', label: 'Worlds', icon: 'pi pi-crown', color: '#fde047', size: 19, match: /world/i },
  { key: 'international', label: 'International', icon: 'pi pi-globe', color: '#fbbf24', size: 18, match: /internationa/i },
  { key: 'regional', label: 'Regional', icon: 'pi pi-trophy', color: '#facc15', size: 17, match: /regional/i },
  { key: 'cup', label: 'League Cup', icon: 'pi pi-star-fill', color: '#e5e7eb', size: 15, match: /\bcup\b/i },
  { key: 'challenge', label: 'League Challenge', icon: 'pi pi-star', color: '#cd7f32', size: 14, match: /chall[ae]nge/i },
  { key: 'prerelease', label: 'Prerelease', icon: 'pi pi-box', color: '#9aa3b1', size: 13, match: /pre[-\s]?release/i },
  { key: 'local', label: 'Local', icon: 'pi pi-home', color: '#9aa3b1', size: 12, match: /\b(local|locals|league|liga)\b/i },
]

// Detection depends only on the title, so cache by title (null = no match).
const typeCache = new Map<string, EventType | null>()
function eventType(ev: CalendarEvent): EventType | null {
  let t = typeCache.get(ev.title)
  if (t === undefined) {
    t = EVENT_TYPES.find((e) => e.match.test(ev.title)) ?? null
    typeCache.set(ev.title, t)
  }
  return t
}

const selectedEvent = ref<CalendarEvent | null>(null)
const showEventDialog = ref(false)

function openEvent(ev: CalendarEvent) {
  selectedEvent.value = ev
  showEventDialog.value = true
}

/** Store the selected event belongs to (title prefix before " - "). */
const selectedStore = computed(() => (selectedEvent.value ? storeKey(selectedEvent.value) : ''))

/** Google Maps search link for a location string. */
function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

const monthLabel = computed(() => `${MONTHS[viewMonth.value]} ${viewYear.value}`)

/** Local YYYY-MM-DD key for a date. */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Events grouped by the local date of their start. */
const eventsByDay = computed(() => {
  const map = new Map<string, CalendarEvent[]>()
  for (const ev of props.events) {
    const key = dateKey(new Date(ev.start))
    const bucket = map.get(key)
    if (bucket) bucket.push(ev)
    else map.set(key, [ev])
  }
  return map
})

interface DayCell {
  date: Date
  key: string
  inMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

/** 6-week (42-cell) grid, Monday-first, covering the current month. */
const days = computed<DayCell[]>(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() + 6) % 7 // Monday = 0
  const start = new Date(viewYear.value, viewMonth.value, 1 - offset)
  const todayKey = dateKey(new Date())

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const key = dateKey(date)
    return {
      date,
      key,
      inMonth: date.getMonth() === viewMonth.value,
      isToday: key === todayKey,
      events: eventsByDay.value.get(key) ?? [],
    }
  })
})

function eventTime(ev: CalendarEvent): string {
  if (ev.allDay) return 'All day'
  return new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Full date label for the dialog, e.g. "Monday, 9 June 2026". */
function eventDate(ev: CalendarEvent): string {
  return new Date(ev.start).toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Start–end time range for the dialog (or "All day"). */
function eventTimeRange(ev: CalendarEvent): string {
  if (ev.allDay) return 'All day'
  const start = eventTime(ev)
  if (!ev.end) return start
  const end = new Date(ev.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${start} – ${end}`
}

/** Days of the viewed month that have events — drives the mobile agenda view. */
const agendaDays = computed(() => days.value.filter((d) => d.inMonth && d.events.length))

/** Long-ish date label for agenda headers, e.g. "Mon, 9 Jun". */
function dayLabel(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
}

function shiftMonth(delta: number) {
  const next = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = next.getFullYear()
  viewMonth.value = next.getMonth()
}

function goToday() {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
}
</script>

<template>
  <div class="cal">
    <header class="cal__bar">
      <h2 class="cal__title">{{ monthLabel }}</h2>
      <div class="cal__nav">
        <Button icon="pi pi-chevron-left" severity="secondary" rounded text aria-label="Previous month" @click="shiftMonth(-1)" />
        <Button label="Today" severity="secondary" size="small" @click="goToday" />
        <Button icon="pi pi-chevron-right" severity="secondary" rounded text aria-label="Next month" @click="shiftMonth(1)" />
      </div>
    </header>

    <div class="cal__weekdays">
      <span v-for="wd in WEEKDAYS" :key="wd" class="cal__weekday">{{ wd }}</span>
    </div>

    <div class="cal__grid">
      <div
        v-for="day in days"
        :key="day.key"
        class="cal__cell"
        :class="{ 'cal__cell--out': !day.inMonth, 'cal__cell--today': day.isToday }"
      >
        <span class="cal__date">{{ day.date.getDate() }}</span>
        <ul class="cal__events">
          <li
            v-for="ev in day.events"
            :key="ev.uid"
            class="cal__event"
            :title="ev.title"
            :style="{ '--event-color': colorFor(ev) }"
            @click="openEvent(ev)"
          >
            <img class="cal__event-icon" :src="iconFor(ev)" alt="" />
            <span class="cal__event-time">{{ eventTime(ev) }}</span>
            <span class="cal__event-name">{{ ev.title }}</span>
            <i
              v-if="eventType(ev)"
              class="cal__event-type"
              :class="eventType(ev)!.icon"
              :style="{ color: eventType(ev)!.color, fontSize: `${eventType(ev)!.size}px` }"
              :title="eventType(ev)!.label"
            />
          </li>
        </ul>
      </div>
    </div>

    <!-- Mobile-only agenda (list) view; the grid above is hidden on phones. -->
    <div class="cal__agenda">
      <template v-if="agendaDays.length">
        <section
          v-for="day in agendaDays"
          :key="day.key"
          class="agenda-day"
          :class="{ 'agenda-day--today': day.isToday }"
        >
          <h3 class="agenda-day__date">{{ dayLabel(day.date) }}</h3>
          <ul class="agenda-day__events">
            <li
              v-for="ev in day.events"
              :key="ev.uid"
              class="agenda-event"
              :style="{ '--event-color': colorFor(ev) }"
              @click="openEvent(ev)"
            >
              <img class="agenda-event__icon" :src="iconFor(ev)" alt="" />
              <div class="agenda-event__body">
                <span class="agenda-event__name">{{ ev.title }}</span>
                <span class="agenda-event__time">{{ eventTime(ev) }}</span>
              </div>
              <i
                v-if="eventType(ev)"
                class="agenda-event__type"
                :class="eventType(ev)!.icon"
                :style="{ color: eventType(ev)!.color, fontSize: `${eventType(ev)!.size}px` }"
                :title="eventType(ev)!.label"
              />
            </li>
          </ul>
        </section>
      </template>
      <p v-else class="agenda-empty">No events in {{ monthLabel }}.</p>
    </div>

    <Dialog
      v-model:visible="showEventDialog"
      modal
      :draggable="false"
      :header="selectedEvent?.title || 'Event'"
      class="event-dialog"
    >
      <ul v-if="selectedEvent" class="event-info">
        <li class="event-info__row">
          <i class="pi pi-calendar event-info__icon" />
          <div class="event-info__text">
            <span class="event-info__label">When</span>
            <span class="event-info__value">{{ eventDate(selectedEvent) }}</span>
            <span class="event-info__value event-info__value--muted">
              {{ eventTimeRange(selectedEvent) }}
            </span>
          </div>
        </li>

        <li v-if="selectedStore && !isBigEvent(selectedStore)" class="event-info__row">
          <i class="pi pi-shop event-info__icon" />
          <div class="event-info__text">
            <span class="event-info__label">Store</span>
            <span class="event-info__value">{{ selectedStore }}</span>
          </div>
        </li>

        <li v-if="eventType(selectedEvent)" class="event-info__row">
          <i
            class="event-info__icon"
            :class="eventType(selectedEvent)!.icon"
            :style="{ color: eventType(selectedEvent)!.color }"
          />
          <div class="event-info__text">
            <span class="event-info__label">Type</span>
            <span class="event-info__value">{{ eventType(selectedEvent)!.label }}</span>
          </div>
        </li>

        <li v-if="selectedEvent.location" class="event-info__row">
          <i class="pi pi-map-marker event-info__icon" />
          <div class="event-info__text">
            <span class="event-info__label">Location</span>
            <a
              class="event-info__value event-info__link"
              :href="mapsUrl(selectedEvent.location)"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ selectedEvent.location }}
              <i class="pi pi-external-link event-info__link-icon" />
            </a>
          </div>
        </li>
      </ul>
    </Dialog>
  </div>
</template>

<style scoped>
.cal {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 1rem 1.25rem 1.25rem;
  box-shadow: 0 10px 30px rgb(0 0 0 / 35%);
}

.cal__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.cal__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.cal__nav {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.cal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
}

.cal__weekday {
  text-align: center;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--app-text-muted);
  padding: 4px 0;
}

.cal__grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.cal__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--app-surface-2);
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 6px 7px;
  min-height: 0;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.cal__cell:hover {
  border-color: var(--app-border);
}

.cal__cell--out {
  opacity: 0.4;
}

.cal__cell--today {
  border-color: var(--app-accent);
  box-shadow: inset 0 0 0 1px var(--app-accent);
}

.cal__date {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--app-text-muted);
  margin-bottom: 4px;
}

.cal__cell--today .cal__date {
  color: var(--app-accent);
}

.cal__events {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.cal__event {
  flex: 1 1 0;
  min-height: 24px;
  max-height: 60px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: color-mix(in srgb, var(--event-color, var(--app-accent)) 18%, transparent);
  border-left: 3px solid var(--event-color, var(--app-accent));
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 0.78rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  transition:
    background 0.12s ease,
    transform 0.06s ease;
}

.cal__event:hover {
  background: color-mix(in srgb, var(--event-color, var(--app-accent)) 30%, transparent);
}

.cal__event:active {
  transform: scale(0.99);
}

.cal__event-icon {
  flex: none;
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.cal__event-time {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: var(--app-text-muted);
}

.cal__event-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal__event-type {
  flex: none;
  margin-left: 4px;
  line-height: 1;
}

.event-info {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: min(360px, 80vw);
}

.event-info__row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.event-info__icon {
  flex: none;
  margin-top: 2px;
  font-size: 1.05rem;
  color: var(--app-accent);
  line-height: 1;
}

.event-info__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.event-info__label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--app-text-muted);
}

.event-info__value {
  font-size: 0.95rem;
  color: var(--app-text);
  word-break: break-word;
}

.event-info__value--muted {
  font-size: 0.85rem;
  color: var(--app-text-muted);
  font-variant-numeric: tabular-nums;
}

.event-info__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--app-accent);
  text-decoration: none;
}

.event-info__link:hover {
  text-decoration: underline;
}

.event-info__link-icon {
  flex: none;
  font-size: 0.75rem;
}

/* ---- Mobile agenda (list) view ----
   The month grid is unreadable on phones, so below 640px we hide it and show a
   scrollable, day-grouped list instead. */
.cal__agenda {
  display: none;
}

.agenda-day {
  margin-bottom: 1rem;
}

.agenda-day__date {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0 0 0.4rem;
  padding: 0.3rem 0;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--app-text-muted);
  background: var(--app-surface);
}

.agenda-day--today .agenda-day__date {
  color: var(--app-accent);
}

.agenda-day__events {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.agenda-event {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--event-color, var(--app-accent)) 16%, transparent);
  border-left: 4px solid var(--event-color, var(--app-accent));
  cursor: pointer;
}

.agenda-event:active {
  transform: scale(0.99);
}

.agenda-event__icon {
  flex: none;
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.agenda-event__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.agenda-event__name {
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agenda-event__time {
  font-size: 0.78rem;
  color: var(--app-text-muted);
  font-variant-numeric: tabular-nums;
}

.agenda-event__type {
  flex: none;
  line-height: 1;
}

.agenda-empty {
  margin: 1.5rem 0;
  text-align: center;
  color: var(--app-text-muted);
}

@media (max-width: 640px) {
  .cal {
    padding: 0.7rem 0.8rem 0.9rem;
    border-radius: 10px;
    height: auto;
    max-width: 100%;
    overflow-x: hidden;
  }

  /* Title on top, month nav spread across its own full-width row, so it never
     overflows narrow screens. */
  .cal__bar {
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.8rem;
  }

  .cal__title {
    font-size: 1.15rem;
  }

  .cal__nav {
    width: 100%;
    justify-content: space-between;
  }

  /* Swap the grid for the agenda list. */
  .cal__weekdays,
  .cal__grid {
    display: none;
  }

  .cal__agenda {
    display: block;
    flex: 1;
  }
}
</style>
