import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'
import { useSettingsStore } from '@/stores/settings'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/focus',
      name: 'focus',
      component: () => import('../views/FocusModeView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/changelog',
      name: 'changelog',
      component: () => import('../views/ChangelogView.vue'),
    },
    {
      path: '/task/:id',
      name: 'task-detail',
      component: () => import('../views/TaskDetailView.vue'),
    },
  ],
})

// Navigation Guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Always ensure auth is initialized before checking routes
  await authStore.initAuth()

  const isPublic = to.name === 'login'
  const isAuthenticated = !!authStore.user

  // Initialize todo store if user is authenticated and accessing protected route
  if (isAuthenticated && !isPublic) {
    const todoStore = useTodoStore()
    try {
      await Promise.all([
        todoStore.initialize(),
        useSettingsStore().initialize()
      ])
    } catch (error) {
      console.error('Failed to initialize stores:', error)
    }
  }

  if (!isPublic && !isAuthenticated) {
    next('/login')
  } else if (isPublic && isAuthenticated) {
    next('/') // Redirect to home if already logged in and trying to access login
  } else {
    next()
  }
})

export default router
