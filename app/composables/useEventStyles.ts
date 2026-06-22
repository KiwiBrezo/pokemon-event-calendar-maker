import { withBase } from 'ufo'
import type { CalendarEvent } from '~~/shared/types/event'

/** Default icon shown on the left of every event pill (resolved against baseURL). */
export const DEFAULT_EVENT_ICON = '/icons/placeholder.png'

/**
 * Preset palette used to auto-assign a distinct color per store. Stores are
 * mapped onto this deterministically (by name hash) so a store keeps the same
 * color across reloads and regardless of event order.
 */
export const STORE_PALETTE = [
  '#ef4444', '#f59e0b', '#22c55e', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#eab308',
  '#f97316', '#06b6d4', '#8b5cf6', '#10b981',
]

/**
 * Explicit per-store color overrides (set from the edit modal). Module-level +
 * reactive so the editor and the calendar share one source of truth. Stores
 * without an override fall back to the auto-assigned palette color.
 */
const storeOverrides = reactive<Record<string, string>>({})

/**
 * Group keys for the big multi-venue events. WORLDS / INTERNATIONALS /
 * REGIONALS aren't stores — they're large events that should each share a
 * single color regardless of which venue hosts them.
 */
export const WORLDS_KEY = 'Worlds'
export const REGIONALS_KEY = 'Regionals'
export const INTERNATIONALS_KEY = 'Internationals'

const BIG_EVENT_KEYS = new Set([WORLDS_KEY, REGIONALS_KEY, INTERNATIONALS_KEY])

/** True for the big events that group by tier instead of by store. */
export function isBigEvent(key: string): boolean {
  return BIG_EVENT_KEYS.has(key)
}

/**
 * Derive the color-grouping key from the title.
 * - WORLDS / INTERNATIONALS / REGIONALS are big events: every instance shares
 *   one key (and thus one color), no matter the venue.
 * - Everything else groups by store: titles are formatted "<Store> - <TIER>"
 *   (e.g. "Kartenchaos - CHALLENGE"), so the store is the part before " - ".
 *   `location` is a full street address here, so it's unreliable as a store key.
 */
export function storeKey(ev: CalendarEvent): string {
  const title = ev.title.trim()
  if (/world/i.test(title)) return WORLDS_KEY
  if (/internationa/i.test(title)) return INTERNATIONALS_KEY
  if (/regional/i.test(title)) return REGIONALS_KEY
  const store = title.split(/\s+-\s+/)[0]?.trim()
  return store || title
}

/** Stable string hash → palette index. */
function autoColor(store: string): string {
  let h = 0
  for (let i = 0; i < store.length; i++) {
    h = (h * 31 + store.charCodeAt(i)) | 0
  }
  return STORE_PALETTE[Math.abs(h) % STORE_PALETTE.length]!
}

export function useEventStyles() {
  const baseURL = useRuntimeConfig().app.baseURL

  function colorFor(ev: CalendarEvent): string {
    const store = storeKey(ev)
    return storeOverrides[store] ?? autoColor(store)
  }

  function iconFor(_ev: CalendarEvent): string {
    return withBase(DEFAULT_EVENT_ICON, baseURL)
  }

  function setStoreColor(store: string, color: string) {
    storeOverrides[store] = color
  }

  return { storeKey, isBigEvent, colorFor, iconFor, setStoreColor, storeOverrides }
}
