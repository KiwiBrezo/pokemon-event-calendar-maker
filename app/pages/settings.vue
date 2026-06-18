<script setup lang="ts">
const { url, events, loading, error, load, ensureLoaded } = useCalendar()
const { storeKey, colorFor, setStoreColor } = useEventStyles()

// Local draft so typing doesn't change the active calendar until "Recreate".
const draftUrl = ref(url.value)

// Keep the calendar available (and the store list populated) even if the user
// lands on /settings directly or after a refresh.
onMounted(ensureLoaded)

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#22c55e', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#e6e8eb',
]

/** Unique stores present in the loaded feed, each with its current color. */
const stores = computed(() => {
  const map = new Map<string, string>()
  for (const ev of events.value) {
    const key = storeKey(ev)
    if (!map.has(key)) map.set(key, colorFor(ev))
  }
  return [...map.entries()].map(([name, color]) => ({ name, color }))
})

/** PrimeVue ColorPicker works with bare hex (no leading '#'). */
function onPick(store: string, hex: string) {
  setStoreColor(store, hex.startsWith('#') ? hex : `#${hex}`)
}

async function recreate() {
  if (await load(draftUrl.value)) {
    await navigateTo('/')
  }
}
</script>

<template>
  <main class="settings-page">
    <div class="settings-page__inner">
      <header class="settings-page__head">
        <NuxtLink to="/" class="settings-page__back">
          <Button icon="pi pi-arrow-left" label="Back to calendar" severity="secondary" text />
        </NuxtLink>
        <h1 class="settings-page__title">Calendar settings</h1>
      </header>

      <!-- Feed URL -->
      <section class="card">
        <h2 class="card__title">Public calendar URL</h2>
        <p class="card__hint">
          Paste the public iCal (.ics) link of your Google Calendar, then press Recreate. The
          calendar lasts until you refresh the page, after which the default calendar loads again.
        </p>
        <InputText
          id="cal-url"
          v-model="draftUrl"
          class="card__input"
          placeholder="https://calendar.google.com/calendar/ical/.../public/basic.ics"
          aria-label="Public calendar URL"
        />

        <p v-if="error" class="card__error">
          <i class="pi pi-exclamation-triangle" /> {{ error }}
        </p>

        <div class="card__actions">
          <Button label="Recreate calendar" icon="pi pi-sparkles" :loading="loading" @click="recreate" />
        </div>
      </section>

      <!-- Per-store colors -->
      <section class="card">
        <h2 class="card__title">Store colors</h2>
        <p class="card__hint">
          Each store gets its own color across the calendar. Pick a preset or a custom color.
        </p>

        <p v-if="!stores.length" class="card__empty">
          No events loaded yet — recreate the calendar to manage store colors.
        </p>

        <ul v-else class="stores">
          <li v-for="store in stores" :key="store.name" class="store">
            <span class="store__swatch" :style="{ background: store.color }" />
            <span class="store__name">{{ store.name }}</span>
            <div class="store__presets">
              <button
                v-for="c in PRESET_COLORS"
                :key="c"
                type="button"
                class="swatch"
                :class="{ 'swatch--active': store.color.toLowerCase() === c.toLowerCase() }"
                :style="{ background: c }"
                :aria-label="`Use color ${c} for ${store.name}`"
                @click="onPick(store.name, c)"
              />
            </div>
            <ColorPicker
              :modelValue="store.color.replace('#', '')"
              format="hex"
              @update:modelValue="(v: string) => onPick(store.name, v)"
            />
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<style scoped>
.settings-page {
  min-height: 100dvh;
  padding: 1.5rem;
  overflow-y: auto;
}

.settings-page__inner {
  width: min(720px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-page__head {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.settings-page__back {
  align-self: flex-start;
  text-decoration: none;
}

.settings-page__title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  padding: 1.25rem 1.4rem;
  box-shadow: 0 10px 30px rgb(0 0 0 / 25%);
}

.card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.card__hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--app-text-muted);
  line-height: 1.5;
}

.card__input {
  width: 100%;
}

.card__error {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  color: #fca5a5;
  font-size: 0.9rem;
}

.card__actions {
  display: flex;
  justify-content: flex-end;
}

.card__empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--app-text-muted);
}

.stores {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.store {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  background: var(--app-surface-2);
  border-radius: 10px;
}

.store__swatch {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.store__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.store__presets {
  display: flex;
  gap: 0.35rem;
}

.swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.swatch--active {
  border-color: var(--app-text);
  box-shadow: 0 0 0 2px var(--app-surface) inset;
}
</style>
