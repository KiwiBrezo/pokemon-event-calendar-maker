<script setup lang="ts">
import type { CalendarEvent } from '~~/shared/types/event'

const props = defineProps<{ events: CalendarEvent[] }>()

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
          <li v-for="ev in day.events" :key="ev.uid" class="cal__event" :title="ev.title">
            <span class="cal__event-time">{{ eventTime(ev) }}</span>
            <span class="cal__event-name">{{ ev.title }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cal {
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
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(96px, 1fr);
  gap: 6px;
}

.cal__cell {
  position: relative;
  background: var(--app-surface-2);
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 6px 7px;
  min-height: 96px;
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
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cal__event {
  display: flex;
  align-items: baseline;
  gap: 5px;
  background: color-mix(in srgb, var(--app-accent) 18%, transparent);
  border-left: 2px solid var(--app-accent);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.74rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
}

.cal__event-time {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: var(--app-text-muted);
}

.cal__event-name {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
