import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'

export type Theme = 'light' | 'dark'
export type ColorPalette = 'purple' | 'blue' | 'green' | 'rose' | 'orange' | 'indigo'

interface PaletteColors {
  primary: string
  primaryLight: string
  primaryDark: string
}

// Color palette definitions
const COLOR_PALETTES: Record<ColorPalette, PaletteColors> = {
  purple: {
    primary: '#6c5ce7',
    primaryLight: '#9b8ef7',
    primaryDark: '#5849c7',
  },
  blue: {
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
  },
  green: {
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
  },
  rose: {
    primary: '#f43f5e',
    primaryLight: '#fb7185',
    primaryDark: '#e11d48',
  },
  orange: {
    primary: '#f59e0b',
    primaryLight: '#fbbf24',
    primaryDark: '#d97706',
  },
  indigo: {
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',
  },
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('light')
  const colorPalette = ref<ColorPalette>('purple')
  const initialized = ref(false)

  // Apply color palette to CSS variables
  const applyColorPalette = (palette: ColorPalette) => {
    const colors = COLOR_PALETTES[palette]
    const root = document.documentElement
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-primary-light', colors.primaryLight)
    root.style.setProperty('--color-primary-dark', colors.primaryDark)
  }

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

    // Apply color palette from localStorage
    const storedPalette = localStorage.getItem('done-color-palette') as ColorPalette | null
    if (storedPalette && COLOR_PALETTES[storedPalette]) {
      colorPalette.value = storedPalette
    }

    applyTheme(theme.value)
    applyColorPalette(colorPalette.value)
    initialized.value = true

    // Then try to sync with IndexedDB if available
    try {
      const db = getDatabase()
      const storedTheme = await db.table('settings').get('theme')
      const storedPaletteDB = await db.table('settings').get('colorPalette')

      if (storedTheme && storedTheme.value !== theme.value) {
        theme.value = storedTheme.value as Theme
        applyTheme(theme.value)
        localStorage.setItem('done-theme', theme.value)
      } else if (!storedTheme) {
        // Save current theme to IndexedDB
        await db.table('settings').put({ key: 'theme', value: theme.value }, 'key')
      }

      if (storedPaletteDB && storedPaletteDB.value !== colorPalette.value) {
        colorPalette.value = storedPaletteDB.value as ColorPalette
        applyColorPalette(colorPalette.value)
        localStorage.setItem('done-color-palette', colorPalette.value)
      } else if (!storedPaletteDB) {
        // Save current palette to IndexedDB
        await db.table('settings').put({ key: 'colorPalette', value: colorPalette.value }, 'key')
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

  // Set color palette
  const setColorPalette = async (palette: ColorPalette) => {
    colorPalette.value = palette
    applyColorPalette(palette)

    // Persist to localStorage immediately
    localStorage.setItem('done-color-palette', palette)

    // Also persist to IndexedDB if available
    try {
      const db = getDatabase()
      await db.table('settings').put({ key: 'colorPalette', value: palette }, 'key')
    } catch {
      // Database not available yet, that's fine - localStorage has it
    }
  }

  // Get all available palettes
  const getAvailablePalettes = (): ColorPalette[] => {
    return Object.keys(COLOR_PALETTES) as ColorPalette[]
  }

  // Get colors for a specific palette
  const getPaletteColors = (palette: ColorPalette): PaletteColors => {
    return COLOR_PALETTES[palette]
  }

  return {
    theme,
    colorPalette,
    initialized,
    initialize,
    toggleTheme,
    setTheme,
    setColorPalette,
    getAvailablePalettes,
    getPaletteColors,
  }
})
