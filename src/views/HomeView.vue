<script setup lang="ts">
import Layout from '@/components/Layout.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <Layout>
    <div class="home-content">
      <h2>Welcome to Done</h2>
      <p class="user-info">
        Signed in as <strong>{{ authStore.user?.email }}</strong>
      </p>
      <p class="placeholder-text">
        Your productivity workspace is ready. More features coming soon.
      </p>
    </div>
  </Layout>
</template>

<style scoped>
.home-content {
  padding: 2rem 0;
}

h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 1rem;
  letter-spacing: -0.5px;
}

.user-info {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  font-size: 1rem;
}

.user-info strong {
  color: #ffffff;
  font-weight: 600;
}

.placeholder-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  line-height: 1.6;
}

@media (max-width: 640px) {
  h2 {
    font-size: 1.75rem;
  }
}
</style>
