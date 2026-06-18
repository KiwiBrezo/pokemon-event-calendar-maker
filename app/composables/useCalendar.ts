import type { CalendarEvent } from '~~/shared/types/event'

/**
 * Shared, app-wide calendar state. Declared at module scope so the landing page
 * (`/`) and the settings page (`/settings`) read/write one source of truth while
 * navigating client-side. State is in-memory only: a full page refresh resets it,
 * so the calendar reverts to the hardcoded default URL (see runtimeConfig).
 */
const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const error = ref('')

/** The URL the current `events` were loaded from ('' = nothing loaded yet). */
const loadedUrl = ref('')
/** The URL shown/edited in settings (defaults to the configured calendar). */
const url = ref('')

let initialized = false

export function useCalendar() {
  if (!initialized) {
    url.value = useRuntimeConfig().public.defaultCalendarUrl
    initialized = true
  }

  /** Fetch + parse `targetUrl`. Returns true on success. */
  async function load(targetUrl: string = url.value): Promise<boolean> {
    const trimmed = targetUrl.trim()
    if (!trimmed) {
      error.value = 'Please paste a public calendar URL first.'
      return false
    }

    loading.value = true
    error.value = ''
    try {
      events.value = await fetchCalendarEvents(trimmed)
      url.value = trimmed
      loadedUrl.value = trimmed
      return true
    } catch (e: any) {
      error.value = e?.message || 'Something went wrong fetching the calendar.'
      events.value = []
      return false
    } finally {
      loading.value = false
    }
  }

  /** Load once if nothing has been loaded yet (e.g. on first visit). */
  async function ensureLoaded(): Promise<void> {
    if (!loadedUrl.value && !loading.value) await load(url.value)
  }

  return { url, events, loading, error, loadedUrl, load, ensureLoaded }
}
