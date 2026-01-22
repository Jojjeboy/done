import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import i18n from '@/i18n'
import type { SupportedLocale } from '@/i18n'
import { getDatabase } from '@/db'

export const useI18nStore = defineStore('i18n', () => {
  const initialized = ref(false)

  // Initialize locale from IndexedDB or default to English
  const initialize = async () => {
    if (initialized.value) {
      return
    }

    try {
      const db = getDatabase()
      const storedLocale = await db.table('settings').get('locale')

      if (storedLocale) {
        i18n.global.locale.value = storedLocale.value as SupportedLocale
      } else {
        i18n.global.locale.value = 'en'
      }

      initialized.value = true
    } catch {
      i18n.global.locale.value = 'en'
      initialized.value = true
    }
  }

  // Set locale
  const setLocale = async (newLocale: SupportedLocale) => {
    i18n.global.locale.value = newLocale

    try {
      const db = getDatabase()
      await db.table('settings').put({ key: 'locale', value: newLocale }, 'key')
    } catch (err) {
      console.warn('Could not persist locale preference:', err)
    }
  }

  return {
    locale: computed(() => i18n.global.locale.value as SupportedLocale),
    initialized,
    initialize,
    setLocale,
  }
})
