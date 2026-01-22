<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Bell } from 'lucide-vue-next'

const authStore = useAuthStore()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const userInitials = computed(() => {
  if (!authStore.user?.displayName) return 'U'
  return authStore.user.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <header class="mobile-header">
    <div class="header-top">
      <div class="profile-section">
        <div class="profile-avatar">
          {{ userInitials }}
        </div>
        <div class="greeting-section">
          <span class="greeting">{{ greeting }} 👋</span>
        </div>
      </div>
      <button class="bell-btn" aria-label="Notifications">
        <Bell class="w-5 h-5" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.mobile-header {
  padding: 1rem;
  background-color: #ffffff;
  border-bottom: 1px solid #F3F4F6;
}

.dark .mobile-header {
  background-color: #1A1A1A;
  border-bottom-color: #374151;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.profile-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.greeting-section {
  display: flex;
  flex-direction: column;
}

.greeting {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #111827;
}

.dark .greeting {
  color: #F9FAFB;
}

.bell-btn {
  background: transparent;
  border: none;
  color: #6B7280;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.bell-btn:hover {
  color: #111827;
}

.dark .bell-btn:hover {
  color: #F9FAFB;
}
</style>
