import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useAuthStore } from './stores/auth'
import { useTodoStore } from './stores/todo'
import { useThemeStore } from './stores/theme'
import { useI18nStore } from './stores/i18n'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Initialize theme immediately (before auth) so styles apply correctly
const themeStore = useThemeStore()
themeStore.initialize().then(async () => {
  // Initialize auth store, then i18n, then mount app
  const authStore = useAuthStore()
  await authStore.initAuth()
  
  const i18nStore = useI18nStore()
  await i18nStore.initialize()
  
  // Only initialize todo store if user is authenticated
  if (authStore.user) {
    const todoStore = useTodoStore()
    await todoStore.initialize()
  }
  
  app.mount('#app')
})
