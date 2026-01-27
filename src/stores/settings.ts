import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'

export const useSettingsStore = defineStore('settings', () => {
  const isThreeStepEnabled = ref(false)
  const focusModeTaskIds = ref<string[]>([])
  const inSelectionMode = ref(false)
  const initialized = ref(false)

  const initialize = async () => {
    if (initialized.value) return
    try {
      const db = getDatabase()
      const [threeStep, focusIds] = await Promise.all([
        db.table('settings').get('isThreeStepEnabled'),
        db.table('settings').get('focusModeTaskIds')
      ])

      if (threeStep) isThreeStepEnabled.value = !!threeStep.value
      // Parse JSON string if stored as such, or direct array
      if (focusIds && focusIds.value) {
        try {
          focusModeTaskIds.value = JSON.parse(focusIds.value)
        } catch {
          focusModeTaskIds.value = []
        }
      }

      initialized.value = true
    } catch (e) {
      console.error('Failed to initialize settings store', e)
    }
  }

  const setThreeStepEnabled = async (value: boolean) => {
    isThreeStepEnabled.value = value
    try {
      const db = getDatabase()
      await db.table('settings').put({ key: 'isThreeStepEnabled', value })
    } catch (e) {
      console.error('Failed to save settings', e)
    }
  }

  const toggleSelectionMode = () => {
    inSelectionMode.value = !inSelectionMode.value
  }

  const addToFocusMode = async (taskId: string) => {
    if (!focusModeTaskIds.value.includes(taskId)) {
      focusModeTaskIds.value.push(taskId)
      await saveFocusModeIds()
    }
  }

  const removeFromFocusMode = async (taskId: string) => {
    focusModeTaskIds.value = focusModeTaskIds.value.filter(id => id !== taskId)
    await saveFocusModeIds()
  }

  const toggleTaskInFocusMode = async (taskId: string) => {
    if (focusModeTaskIds.value.includes(taskId)) {
      await removeFromFocusMode(taskId)
    } else {
      await addToFocusMode(taskId)
    }
  }

  const clearFocusMode = async () => {
    focusModeTaskIds.value = []
    await saveFocusModeIds()
  }

  const saveFocusModeIds = async () => {
    try {
      const db = getDatabase()
      await db.table('settings').put({
        key: 'focusModeTaskIds',
        value: JSON.stringify(focusModeTaskIds.value)
      })
    } catch (e) {
      console.error('Failed to save focus mode settings', e)
    }
  }

  return {
    isThreeStepEnabled,
    focusModeTaskIds,
    inSelectionMode,
    initialize,
    setThreeStepEnabled,
    toggleSelectionMode,
    addToFocusMode,
    removeFromFocusMode,
    toggleTaskInFocusMode,
    clearFocusMode
  }
})
