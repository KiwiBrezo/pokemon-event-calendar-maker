/**
 * DEV-ONLY iCal proxy. Mirrors the nginx `proxy_pass` from `deploy/nginx.conf`
 * so `npm run dev` behaves like the deployed static site (same-origin fetch →
 * no CORS). This route is NOT part of the static `npm run generate` output that
 * gets deployed; in production nginx handles `/pokemon-event-calendar/ical/**`.
 *
 * (A `routeRules` proxy can't be used here: with `app.baseURL` set, Nitro's
 * proxy stripBase check mismatches the base-prefixed path and 400s.)
 */
export default defineEventHandler(async (event) => {
  // Everything after `/ical/`, encoding preserved (e.g. the `%40` in the cal id).
  const rest = event.path.replace(/^.*\/ical\//, '')
  const target = `https://calendar.google.com/calendar/ical/${rest}`

  let text: string
  try {
    text = await $fetch<string>(target, {
      responseType: 'text',
      headers: { accept: 'text/calendar' },
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Could not fetch the calendar feed.' })
  }

  setHeader(event, 'content-type', 'text/calendar; charset=utf-8')
  return text
})
