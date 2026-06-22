import tailwindcss from '@tailwindcss/vite'
import Aura from '@primeuix/themes/aura'

// Full public sub-path the static site is served under (see app.baseURL below).
// Reused for asset URLs (favicon) so they resolve under the same prefix.
const baseURL = '/demo-server/pokemon-event-calendar/'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  modules: ['@primevue/nuxt-module'],

  runtimeConfig: {
    public: {
      // Default public Google Calendar (.ics) loaded automatically on first visit.
      // Override at build time with NUXT_PUBLIC_DEFAULT_CALENDAR_URL.
      defaultCalendarUrl:
        'https://calendar.google.com/calendar/ical/7c7c4a1830cbd5083b696a7c054983dc4e219b9c61554373fdc0f178c609de21%40group.calendar.google.com/public/basic.ics',
    },
  },

  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: {
            name: 'primevue',
            order: 'theme, base, primevue',
          },
        },
      },
    },
  },

  app: {
    // Deployed as static files under this sub-path on the nginx server.
    // Must match the FULL public path (the demo-server prefix is part of the URL).
    baseURL,
    head: {
      title: 'Pokémon Event Calendar',
      htmlAttrs: { lang: 'en', class: 'app-dark' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `${baseURL}favicon.svg` },
        { rel: 'alternate icon', type: 'image/x-icon', href: `${baseURL}favicon.ico` },
      ],
    },
  },
})
