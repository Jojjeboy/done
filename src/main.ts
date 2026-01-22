import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useTodoStore } from './stores/todo'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth store, then todo store, then mount app
const authStore = useAuthStore()
authStore.initAuth().then(async () => {
  // Initialize todo store after authentication
  const todoStore = useTodoStore()
  await todoStore.initialize()
  
  app.mount('#app')
})
