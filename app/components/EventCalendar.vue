<script setup lang="ts">
import type { CalendarEvent } from '~~/shared/types/event'

const props = defineProps<{ events: CalendarEvent[] }>()

const { storeKey, colorFor, iconFor, setStoreColor } = useEventStyles()

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#22c55e', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#e6e8eb',
]

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

/** Store of the selected event — editing recolors the whole store. */
const selectedStore = computed(() => (selectedEvent.value ? storeKey(selectedEvent.value) : ''))

/** Reads/writes the selected store's color through the shared style store. */
const editColor = computed({
  get: () => (selectedEvent.value ? colorFor(selectedEvent.value) : '#ef4444'),
  set: (v: string) => {
    if (selectedStore.value) setStoreColor(selectedStore.value, v)
  },
})

/** PrimeVue ColorPicker works with bare hex (no leading '#'). */
const pickerHex = computed({
  get: () => editColor.value.replace('#', ''),
  set: (v: string) => {
    editColor.value = v.startsWith('#') ? v : `#${v}`
  },
})

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

    <Dialog
      v-model:visible="showEventDialog"
      modal
      :draggable="false"
      :header="selectedEvent?.title || 'Event'"
      class="event-dialog"
    >
      <div v-if="selectedEvent" class="event-edit">
        <p class="event-edit__meta">
          <i class="pi pi-clock" /> {{ eventTime(selectedEvent) }}
          <template v-if="eventType(selectedEvent)">
            <span class="event-edit__dot">·</span>
            <i :class="eventType(selectedEvent)!.icon" :style="{ color: eventType(selectedEvent)!.color }" />
            {{ eventType(selectedEvent)!.label }}
          </template>
        </p>

        <div class="event-edit__field">
          <span class="event-edit__label">Color</span>
          <p class="event-edit__note">
            <i class="pi pi-map-marker" /> Applies to all events at
            <strong>{{ selectedStore }}</strong>
          </p>
          <div class="event-edit__swatches">
            <button
              v-for="c in PRESET_COLORS"
              :key="c"
              type="button"
              class="swatch"
              :class="{ 'swatch--active': editColor.toLowerCase() === c.toLowerCase() }"
              :style="{ background: c }"
              :aria-label="`Use color ${c}`"
              @click="editColor = c"
            />
          </div>
          <div class="event-edit__custom">
            <ColorPicker v-model="pickerHex" format="hex" />
            <span class="event-edit__hex">{{ editColor }}</span>
          </div>
        </div>
      </div>
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

.event-edit {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: min(360px, 80vw);
}

.event-edit__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  color: var(--app-text-muted);
  font-size: 0.9rem;
}

.event-edit__field {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.event-edit__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--app-text-muted);
}

.event-edit__note {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.82rem;
  color: var(--app-text-muted);
}

.event-edit__note strong {
  color: var(--app-text);
}

.event-edit__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.swatch--active {
  border-color: var(--app-text);
  box-shadow: 0 0 0 2px var(--app-surface) inset;
}

.event-edit__custom {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.event-edit__hex {
  font-variant-numeric: tabular-nums;
  color: var(--app-text-muted);
  font-size: 0.85rem;
  text-transform: uppercase;
}
</style>
