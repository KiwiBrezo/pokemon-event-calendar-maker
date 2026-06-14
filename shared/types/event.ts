/** A single calendar event instance, normalized for the UI. */
export interface CalendarEvent {
  uid: string
  title: string
  /** ISO datetime string (start). */
  start: string
  /** ISO datetime string (end), or null if unknown. */
  end: string | null
  /** True for date-only (all-day) events. */
  allDay: boolean
  location: string | null
}
