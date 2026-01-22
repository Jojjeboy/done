import { ref } from 'vue'
import { defineStore } from 'pinia'
import { auth } from '@/firebase'
import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
} from 'firebase/auth'
import { clearDatabaseCache } from '@/db'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)

  // Use a module-level variable to track initialization across store instances
  // This persists across page reloads within the same session
  let initPromise: Promise<void> | null = null

  // Initialize auth listener (only once per session)
  const initAuth = () => {
    // Return existing promise if already initializing
    if (initPromise) {
      return initPromise
    }

    // Create new promise for initialization
    initPromise = new Promise<void>((resolve) => {
      let resolved = false

      // onAuthStateChanged fires immediately with current user (from Firebase persistence)
      // Firebase automatically restores auth state from localStorage on page load
      onAuthStateChanged(auth, (currentUser) => {
        user.value = currentUser

        // Only resolve once on the first callback (initial state check)
        if (!resolved) {
          resolved = true
          loading.value = false
          resolve()
        } else {
          // Subsequent callbacks are just state updates (login/logout)
          loading.value = false
        }
      })
    })

    return initPromise
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const logout = async () => {
    await signOut(auth)
    // Clear database cache on logout
    clearDatabaseCache()
  }

  return { user, loading, initAuth, loginWithGoogle, logout }
})
