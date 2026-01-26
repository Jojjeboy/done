<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LogIn } from 'lucide-vue-next'

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
  <main class="login-view">
    <div class="login-container">
      <div class="login-card">
        <div class="logo-section">
          <div class="logo-circle">
            <span class="logo-icon">✓</span>
          </div>
          <h1 class="app-title">
            Done
          </h1>
          <p class="app-subtitle">
            Task Management & To-Do List
          </p>
        </div>

        <div class="welcome-section">
          <h2 class="welcome-title">{{ t('auth.welcome') }}</h2>
          <p class="welcome-text">
            Sign in to manage your tasks and stay organized
          </p>
        </div>

        <button @click="handleLogin" class="login-button">
          <LogIn :size="20" />
          <span>{{ t('auth.signIn') }}</span>
        </button>

        <p class="privacy-text">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.login-view {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--color-bg-lavender) 0%, var(--color-bg-lighter) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.dark .login-view {
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.15) 0%, var(--color-bg-light) 100%);
}

.login-container {
  width: 100%;
  max-width: 440px;
}

.login-card {
  background: var(--color-bg-white);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-4xl) var(--spacing-3xl);
  box-shadow: var(--shadow-xl);
  text-align: center;
}

.dark .login-card {
  background: var(--color-bg-card);
}

.logo-section {
  margin-bottom: var(--spacing-3xl);
}

.logo-circle {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-xl);
  box-shadow: var(--shadow-purple);
}

.logo-icon {
  font-size: var(--font-size-3xl);
  color: var(--color-text-white);
  font-weight: var(--font-weight-bold);
}

.app-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  letter-spacing: -0.5px;
}

.app-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.welcome-section {
  margin-bottom: var(--spacing-3xl);
  padding: var(--spacing-2xl) 0;
}

.welcome-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.welcome-text {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-relaxed);
}

.login-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg) var(--spacing-2xl);
  background: var(--color-primary);
  color: var(--color-text-white);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-purple);
  margin-bottom: var(--spacing-2xl);
}

.login-button:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(108, 92, 231, 0.3);
}

.login-button:active {
  transform: translateY(0);
}

.privacy-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: var(--line-height-relaxed);
}

@media (max-width: 640px) {
  .login-card {
    padding: var(--spacing-3xl) var(--spacing-2xl);
  }

  .app-title {
    font-size: var(--font-size-2xl);
  }

  .logo-circle {
    width: 64px;
    height: 64px;
  }

  .logo-icon {
    font-size: var(--font-size-2xl);
  }
}
</style>
