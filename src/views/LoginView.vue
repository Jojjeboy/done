<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

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
  <main class="login-container">
    <div class="login-card">
      <h1 class="login-title">Done</h1>
      <p class="login-subtitle">Your personal productivity oasis</p>
      <button @click="handleLogin" class="btn btn-primary">Sign in with Google</button>
    </div>
  </main>
</template>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}

.login-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 3rem 2.5rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
  text-align: center;
}

.login-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #ffffff;
  letter-spacing: -1px;
}

.login-subtitle {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2.5rem;
  font-weight: 400;
}

@media (max-width: 640px) {
  .login-card {
    padding: 2rem 1.5rem;
  }

  .login-title {
    font-size: 2.5rem;
  }
}
</style>
