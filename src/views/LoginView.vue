<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const handleLogin = async () => {
  try {
    await authStore.loginWithGoogle()
    router.push('/')
  } catch (error) {
    console.error('Login failed:', error)
  }
}
</script>

<template>
  <main class="min-h-screen bg-soft-bg dark:bg-soft-dark flex items-center justify-center p-4 transition-colors duration-300">
    <div class="login-card soft-card max-w-md w-full text-center space-y-6">
      <h1 class="text-5xl font-bold text-soft dark:text-gray-100 mb-2 tracking-tight">
        {{ t('common.appName') }}
      </h1>
      <p class="text-lg text-soft-muted mb-8">
        {{ t('auth.welcome') }}
      </p>
      <button
        @click="handleLogin"
        class="login-button soft-button w-full py-4 text-base font-semibold"
      >
        {{ t('auth.signIn') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.login-card {
  padding: 3rem 2.5rem;
}

.login-button {
  background-color: #6366F1;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.login-button:hover {
  background-color: #4F46E5;
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.dark .login-button {
  background-color: #818CF8;
}

.dark .login-button:hover {
  background-color: #6366F1;
}

@media (max-width: 640px) {
  .login-card {
    padding: 2rem 1.5rem;
  }
  
  h1 {
    font-size: 3rem;
  }
}
</style>
