import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')
  const initialized = ref(false)

  // Initialize theme from IndexedDB or system preference
  const initialize = async () => {
    if (initialized.value) {
      return
    }

    // First, apply theme from localStorage or system preference (works without auth)
    const storedThemeLocal = localStorage.getItem('done-theme') as Theme | null
    if (storedThemeLocal && (storedThemeLocal === 'light' || storedThemeLocal === 'dark')) {
      theme.value = storedThemeLocal
    } else {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }

    applyTheme(theme.value)
    initialized.value = true

    // Then try to sync with IndexedDB if available
    try {
      const db = getDatabase()
      const storedTheme = await db.table('settings').get('theme')

      if (storedTheme && storedTheme.value !== theme.value) {
        theme.value = storedTheme.value as Theme
        applyTheme(theme.value)
        localStorage.setItem('done-theme', theme.value)
      } else if (!storedTheme) {
        // Save current theme to IndexedDB
        await db.table('settings').put({ key: 'theme', value: theme.value }, 'key')
      }
    } catch {
      // Database not available yet (user not authenticated), that's fine
      // Theme is already applied from localStorage/system preference
    }
  }

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Toggle theme
  const toggleTheme = async () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    applyTheme(theme.value)

    // Persist to localStorage immediately
    localStorage.setItem('done-theme', theme.value)

    // Also persist to IndexedDB if available
    try {
      const db = getDatabase()
      await db.table('settings').put({ key: 'theme', value: theme.value }, 'key')
    } catch {
      // Database not available yet, that's fine - localStorage has it
    }
  }

  // Set theme explicitly
  const setTheme = async (newTheme: Theme) => {
    theme.value = newTheme
    applyTheme(newTheme)

    // Persist to localStorage immediately
    localStorage.setItem('done-theme', newTheme)

    // Also persist to IndexedDB if available
    try {
      const db = getDatabase()
      await db.table('settings').put({ key: 'theme', value: newTheme }, 'key')
    } catch {
      // Database not available yet, that's fine - localStorage has it
    }
  }

  return {
    theme,
    initialized,
    initialize,
    toggleTheme,
    setTheme,
  }
})
