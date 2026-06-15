<script setup lang="ts">
import type { CalendarEvent } from '~~/shared/types/event'

const url = ref('')
const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const error = ref('')
const hasGenerated = ref(false)

// Open the settings modal by default until a calendar has been created.
const showSettings = ref(true)

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

    <EventCalendar :events="events" class="page__calendar" />

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

.page__calendar {
  flex: 1;
  min-height: 0;
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
