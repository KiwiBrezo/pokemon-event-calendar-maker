import ICAL from 'ical.js'
import type { CalendarEvent } from '~~/shared/types/event'

type ICALTime = InstanceType<typeof ICAL.Time>

/**
 * Map a public Google Calendar .ics URL onto the same-origin proxy path.
 * In prod nginx proxies `<base>/ical/**` → calendar.google.com; in dev a Nitro
 * routeRule does the same. This avoids the browser CORS block on Google feeds.
 */
function toProxyPath(rawUrl: string, baseURL: string): string {
  const normalized = rawUrl.trim().replace(/^webcal:\/\//i, 'https://')

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    throw new Error('That does not look like a valid URL.')
  }

  const marker = '/calendar/ical/'
  const idx = url.pathname.indexOf(marker)
  if (!/(^|\.)calendar\.google\.com$/i.test(url.hostname) || idx < 0) {
    throw new Error('This deployment only supports public Google Calendar (.ics) links.')
  }

  const rest = url.pathname.slice(idx + marker.length)
  return `${baseURL}ical/${rest}${url.search}`
}

function toEvent(
  uidBase: string,
  summary: string,
  location: string | null,
  start: ICALTime,
  end: ICALTime | null,
): CalendarEvent {
  const startDate = start.toJSDate()
  return {
    uid: `${uidBase}-${startDate.getTime()}`,
    title: summary || 'Untitled event',
    start: startDate.toISOString(),
    end: end ? end.toJSDate().toISOString() : null,
    allDay: start.isDate,
    location: location || null,
  }
}

/**
 * Fetch a public Google Calendar feed (via the proxy) and parse it in the
 * browser with ical.js. Recurring events are expanded (EXDATE honored by the
 * iterator) within a window of −24 / +12 months around today.
 */
export async function fetchCalendarEvents(rawUrl: string): Promise<CalendarEvent[]> {
  const baseURL = useRuntimeConfig().app.baseURL
  const proxyPath = toProxyPath(rawUrl, baseURL)

  const text = await $fetch<string>(proxyPath, { responseType: 'text' })

  const comp = new ICAL.Component(ICAL.parse(text))
  const vevents = comp.getAllSubcomponents('vevent')

  const windowStart = new Date()
  windowStart.setMonth(windowStart.getMonth() - 24)
  const windowEnd = new Date()
  windowEnd.setMonth(windowEnd.getMonth() + 12)

  const events: CalendarEvent[] = []

  for (const ve of vevents) {
    const event = new ICAL.Event(ve)
    const uid = event.uid || 'evt'
    const summary = event.summary || 'Untitled event'
    const location = event.location || null

    if (event.isRecurring()) {
      const it = event.iterator()
      let guard = 0
      for (let next = it.next(); next && guard < 2000; next = it.next(), guard++) {
        const occ = next.toJSDate()
        if (occ > windowEnd) break
        if (occ < windowStart) continue
        const det = event.getOccurrenceDetails(next)
        events.push(toEvent(uid, summary, location, det.startDate, det.endDate))
      }
    } else {
      const start = event.startDate
      if (!start) continue
      const occ = start.toJSDate()
      if (occ < windowStart || occ > windowEnd) continue
      events.push(toEvent(uid, summary, location, start, event.endDate))
    }
  }

  events.sort((a, b) => a.start.localeCompare(b.start))
  return events
}
