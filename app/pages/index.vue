<script setup lang="ts">
import type { CalendarEvent } from '~~/shared/types/event'

const url = ref('')
const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const error = ref('')
const hasGenerated = ref(false)

async function generate() {
  if (!url.value.trim()) {
    error.value = 'Please paste a public calendar URL first.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const data = await $fetch('/api/events', { query: { url: url.value.trim() } })
    events.value = data.events
    hasGenerated.value = true
  } catch (e: any) {
    error.value = e?.statusMessage || e?.data?.statusMessage || 'Something went wrong fetching the calendar.'
    events.value = []
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="page">
    <section class="hero">
      <h1 class="hero__title">Pokémon Event Calendar</h1>
      <p class="hero__subtitle">
        Paste the public iCal link of your Google Calendar and generate a clean, shareable calendar.
      </p>

      <form class="generator" @submit.prevent="generate">
        <InputText
          v-model="url"
          class="generator__input"
          placeholder="https://calendar.google.com/calendar/ical/.../public/basic.ics"
          aria-label="Public calendar URL"
        />
        <Button type="submit" label="Generate" icon="pi pi-sparkles" :loading="loading" />
      </form>

      <p v-if="error" class="generator__error">
        <i class="pi pi-exclamation-triangle" /> {{ error }}
      </p>
    </section>

    <section v-if="hasGenerated" class="result">
      <p v-if="!events.length && !loading" class="result__empty">
        No events found in this calendar.
      </p>
      <EventCalendar v-else :events="events" />
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 3rem 1.25rem 4rem;
}

.hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.hero__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.5px;
}

.hero__subtitle {
  margin: 0 auto 2rem;
  max-width: 540px;
  color: var(--app-text-muted);
  line-height: 1.5;
}

.generator {
  display: flex;
  gap: 0.6rem;
  max-width: 640px;
  margin: 0 auto;
}

.generator__input {
  flex: 1;
}

.generator__error {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 1rem auto 0;
  color: #fca5a5;
  font-size: 0.9rem;
}

.result {
  margin-top: 1rem;
}

.result__empty {
  text-align: center;
  color: var(--app-text-muted);
  padding: 2rem 0;
}
</style>
