import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'

export const useSettingsStore = defineStore('settings', () => {
  const isThreeStepEnabled = ref(false)
  const initialized = ref(false)

  const initialize = async () => {
    if (initialized.value) return
    try {
      const db = getDatabase()
      const setting = await db.table('settings').get('isThreeStepEnabled')
      if (setting) {
        isThreeStepEnabled.value = !!setting.value
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

  return { isThreeStepEnabled, initialize, setThreeStepEnabled }
})
