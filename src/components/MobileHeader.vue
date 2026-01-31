<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { Sun, Moon, Eye, FileJson } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'open-import'): void
}>()

const authStore = useAuthStore()
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return t('common.goodMorning')
  if (hour >= 10 && hour < 14) return t('common.goodDay')
  if (hour >= 14 && hour < 18) return t('common.goodAfternoon')
  if (hour >= 18 && hour < 22) return t('common.goodEvening')
  return t('common.goodNight')
})

const userName = computed(() => {
  if (!authStore.user?.displayName) return t('common.user')
  return authStore.user.displayName.split(' ')[0]
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

const userPhotoURL = computed(() => {
  return authStore.user?.photoURL || null
})

const toggleTheme = () => {
  themeStore.toggleTheme()
}
</script>

<template>
  <header class="mobile-header">
    <div class="header-content">
      <div class="profile-section">
        <router-link to="/" class="logo-link">
          <img src="/done.png" alt="Done Logo" class="app-logo" />
          <span class="app-name">{{ t('common.appName') }}</span>
        </router-link>
        <div class="profile-avatar">
          <img v-if="userPhotoURL" :src="userPhotoURL" alt="Profile" class="avatar-image" />
          <span v-else>{{ userInitials }}</span>
        </div>
        <div class="greeting-section">
          <span class="greeting">{{ greeting }}</span>
          <span class="user-name">{{ userName }}</span>
        </div>
      </div>

      <div class="header-actions">
        <button class="action-btn" @click="emit('open-import')" :title="t('common.importTasks')">
          <FileJson :size="20" />
        </button>
        <button class="action-btn" @click="settingsStore.toggleSelectionMode()"
          :class="{ 'active': settingsStore.inSelectionMode }"
          :title="settingsStore.inSelectionMode ? t('common.cancel') : t('focus.enterSelectionMode')">
          <Eye v-if="!settingsStore.inSelectionMode" :size="20" />
          <span v-else class="selection-icon-wrapper">
            <div class="selection-checkbox-icon"></div>
          </span>
        </button>
        <button class="theme-toggle-btn" @click="toggleTheme" :aria-label="t('settings.theme')">
          <Sun v-if="themeStore.theme === 'dark'" :size="20" />
          <Moon v-else :size="20" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.mobile-header {
  padding: var(--spacing-2xl) var(--spacing-2xl) var(--spacing-lg);
  background: linear-gradient(to bottom, var(--color-bg-white) 0%, rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
  z-index: 40;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.dark .mobile-header {
  background: linear-gradient(to bottom, var(--color-bg-card) 0%, rgba(26, 24, 53, 0.95) 100%);
  border-bottom-color: var(--color-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-link {
  display: flex;
  align-items: center;
  transition: opacity var(--transition-base);
}

.logo-link:hover {
  opacity: 0.8;
}

.app-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.app-name {
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--color-primary);
  margin-left: 0.5rem;
}

.profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #6C5CE7 0%, #A78BFA 100%);
  color: var(--color-text-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  flex-shrink: 0;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.greeting-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.greeting {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.user-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
}

.dark .user-name {
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.theme-toggle-btn,
.action-btn {
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  cursor: pointer;
  padding: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  border-radius: var(--radius-md);
}

.theme-toggle-btn:hover,
.action-btn:hover {
  background-color: var(--color-bg-lavender);
  color: var(--color-primary);
}

.dark .theme-toggle-btn:hover,
.dark .action-btn:hover {
  background-color: rgba(108, 92, 231, 0.1);
}

.action-btn.active {
  color: var(--color-primary);
  background-color: var(--color-bg-lavender);
}

.selection-checkbox-icon {
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-radius: 4px;
}
</style>
