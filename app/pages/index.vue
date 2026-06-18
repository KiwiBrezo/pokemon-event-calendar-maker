<script setup lang="ts">
import type { CalendarEvent } from '~~/shared/types/event'

const { defaultCalendarUrl } = useRuntimeConfig().public

const url = ref(defaultCalendarUrl)
const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const error = ref('')
const hasGenerated = ref(false)

// Calendar auto-loads from the default URL on mount, so the settings modal
// starts closed; the user can open it to change the URL and regenerate.
const showSettings = ref(false)

// Auto-generate the calendar from the default URL on first load.
onMounted(() => {
  if (url.value.trim()) create()
})

async function create() {
  if (!url.value.trim()) {
    error.value = 'Please paste a public calendar URL first.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    events.value = await fetchCalendarEvents(url.value.trim())
    hasGenerated.value = true
    showSettings.value = false
  } catch (e: any) {
    error.value = e?.message || 'Something went wrong fetching the calendar.'
    events.value = []
    showSettings.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="page">
    <div class="page__bar">
      <Button
        class="page__settings"
        icon="pi pi-cog"
        label="Settings"
        severity="secondary"
        aria-label="Calendar settings"
        @click="showSettings = true"
      />
    </div>

    <div class="page__stage">
      <EventCalendar :events="events" class="page__calendar" />

      <Transition name="overlay-fade">
        <div v-if="loading" class="loading-overlay" role="status" aria-live="polite">
          <div class="loading-overlay__panel">
            <div class="pokeball" aria-hidden="true">
              <span class="pokeball__top" />
              <span class="pokeball__band" />
              <span class="pokeball__button" />
            </div>
            <ProgressBar mode="indeterminate" class="loading-overlay__bar" />
            <p class="loading-overlay__label">Catching events…</p>
          </div>
        </div>
      </Transition>
    </div>

    <Dialog
      v-model:visible="showSettings"
      modal
      :draggable="false"
      header="Calendar settings"
      class="settings-dialog"
    >
      <form class="settings" @submit.prevent="create">
        <label class="settings__label" for="cal-url">Public calendar URL</label>
        <InputText
          id="cal-url"
          v-model="url"
          class="settings__input"
          placeholder="https://calendar.google.com/calendar/ical/.../public/basic.ics"
          aria-label="Public calendar URL"
        />
        <p class="settings__hint">
          Paste the public iCal link of your Google Calendar and press Create.
        </p>

        <p v-if="error" class="settings__error">
          <i class="pi pi-exclamation-triangle" /> {{ error }}
        </p>

        <div class="settings__actions">
          <Button type="submit" label="Create" icon="pi pi-sparkles" :loading="loading" />
        </div>
      </form>
    </Dialog>
  </main>
</template>

<style scoped>
.page {
  height: 100dvh;
  padding: 1.25rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.page__bar {
  display: flex;
  justify-content: flex-end;
}

.page__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.page__calendar {
  flex: 1;
  min-height: 0;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--app-bg) 70%, transparent);
  backdrop-filter: blur(2px);
}

.loading-overlay__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
  width: min(420px, 70vw);
  padding: 1.75rem 1.75rem 1.5rem;
  border-radius: 0.9rem;
  background: var(--app-surface);
  border: 1px solid color-mix(in srgb, var(--app-accent) 30%, transparent);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}

/* Pure-CSS Pokéball: bounces while the seam wobbles like a caught Pokémon. */
.pokeball {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 4px solid #18181b;
  overflow: hidden;
  background: #f5f5f5;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5);
  transform-origin: 50% 90%;
  animation:
    pokeball-bounce 1s ease-in-out infinite,
    pokeball-wobble 1s ease-in-out infinite;
}

.pokeball__top {
  position: absolute;
  inset: 0 0 50% 0;
  background: var(--app-accent);
}

.pokeball__band {
  position: absolute;
  top: calc(50% - 3px);
  left: 0;
  width: 100%;
  height: 6px;
  background: #18181b;
}

.pokeball__button {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f5f5f5;
  border: 4px solid #18181b;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 2px #f5f5f5;
}

.loading-overlay__bar {
  width: 100%;
  height: 0.5rem;
  border-radius: 999px;
  overflow: hidden;
}

/* Recolor PrimeVue's indeterminate bar to Pokéball red on a white track. */
.loading-overlay__bar :deep(.p-progressbar) {
  background: #e9e9ee;
}

.loading-overlay__bar :deep(.p-progressbar-value) {
  background: var(--app-accent);
}

.loading-overlay__label {
  margin: 0;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--app-text-muted);
}

@keyframes pokeball-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-14px);
  }
}

@keyframes pokeball-wobble {
  0%,
  100% {
    rotate: 0deg;
  }
  25% {
    rotate: -14deg;
  }
  75% {
    rotate: 14deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pokeball {
    animation: none;
  }
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(560px, 80vw);
}

.settings__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--app-text-muted);
}

.settings__input {
  width: 100%;
}

.settings__hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--app-text-muted);
  line-height: 1.45;
}

.settings__error {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.25rem 0 0;
  color: #fca5a5;
  font-size: 0.9rem;
}

.settings__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}
</style>
