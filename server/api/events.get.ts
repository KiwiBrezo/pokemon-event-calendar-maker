import ical from 'node-ical'
import type { CalendarEvent } from '~~/shared/types/event'

/**
 * Fetches a public iCal (.ics) feed server-side (avoids browser CORS) and
 * returns a normalized, flat list of event instances. Recurring events are
 * expanded within a window around today.
 */
export default defineEventHandler(async (event): Promise<{ events: CalendarEvent[] }> => {
  const { url } = getQuery(event)
  let target = String(url ?? '').trim()

  if (!target) {
    throw createError({ statusCode: 400, statusMessage: 'Missing "url" query parameter.' })
  }

  // Google often hands out webcal:// links — same feed over https.
  target = target.replace(/^webcal:\/\//i, 'https://')

  if (!/^https?:\/\//i.test(target)) {
    throw createError({ statusCode: 400, statusMessage: 'URL must start with http(s):// or webcal://' })
  }

  let raw: string
  try {
    raw = await $fetch<string>(target, { responseType: 'text', headers: { accept: 'text/calendar' } })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Could not fetch the calendar feed.' })
  }

  let parsed: Record<string, ical.CalendarComponent>
  try {
    parsed = ical.sync.parseICS(raw)
  } catch {
    throw createError({ statusCode: 422, statusMessage: 'The URL did not return a valid iCal feed.' })
  }

  // Expansion window: 6 months back, 18 months forward.
  const windowStart = new Date()
  windowStart.setMonth(windowStart.getMonth() - 6)
  const windowEnd = new Date()
  windowEnd.setMonth(windowEnd.getMonth() + 18)

  const events: CalendarEvent[] = []

  for (const key in parsed) {
    const item = parsed[key] as any
    if (!item || item.type !== 'VEVENT') continue

    const durationMs =
      item.end && item.start ? new Date(item.end).getTime() - new Date(item.start).getTime() : 0

    if (item.rrule) {
      const occurrences: Date[] = item.rrule.between(windowStart, windowEnd, true)
      const exdates: number[] = Object.values(item.exdate ?? {}).map((d: any) =>
        new Date(d).getTime(),
      )

      for (const occ of occurrences) {
        if (exdates.includes(occ.getTime())) continue
        events.push(toEvent(item, occ, new Date(occ.getTime() + durationMs)))
      }
    } else {
      const start = item.start ? new Date(item.start) : null
      if (!start || start < windowStart || start > windowEnd) continue
      events.push(toEvent(item, start, item.end ? new Date(item.end) : null))
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start))
  return { events }
})

function toEvent(item: any, start: Date, end: Date | null): CalendarEvent {
  return {
    uid: `${String(item.uid ?? 'evt')}-${start.getTime()}`,
    title: String(item.summary ?? 'Untitled event'),
    start: start.toISOString(),
    end: end ? end.toISOString() : null,
    allDay: Boolean(item.start?.dateOnly),
    location: item.location ? String(item.location) : null,
  }
}
