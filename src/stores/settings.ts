import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'

export const useSettingsStore = defineStore('settings', () => {
  const isThreeStepEnabled = ref(false)
  const hideCompleted = ref(false)
  const initialized = ref(false)

  const initialize = async () => {
    if (initialized.value) return
    try {
      const db = getDatabase()
      const [threeStep, hideComp] = await Promise.all([
        db.table('settings').get('isThreeStepEnabled'),
        db.table('settings').get('hideCompleted')
      ])

      if (threeStep) isThreeStepEnabled.value = !!threeStep.value
      if (hideComp) hideCompleted.value = !!hideComp.value

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

  const setHideCompleted = async (value: boolean) => {
    hideCompleted.value = value
    try {
      const db = getDatabase()
      await db.table('settings').put({ key: 'hideCompleted', value })
    } catch (e) {
      console.error('Failed to save settings', e)
    }
  }

  return { isThreeStepEnabled, hideCompleted, initialize, setThreeStepEnabled, setHideCompleted }
})
