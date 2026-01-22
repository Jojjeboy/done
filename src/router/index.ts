import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'
import { useTodoStore } from '@/stores/todo'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/project/:id',
      name: 'project',
      component: () => import('../views/ProjectView.vue'),
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
    if (!todoStore.initialized) {
      try {
        await todoStore.initialize()
      } catch (error) {
        console.error('Failed to initialize todo store:', error)
        // Don't block navigation, but log the error
      }
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
