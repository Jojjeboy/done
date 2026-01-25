<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useI18nStore } from '@/stores/i18n'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, LogOut, Moon, Sun, Globe, ListChecks, RotateCcw } from 'lucide-vue-next'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import type { SupportedLocale } from '@/i18n'
import { ref as vueRef } from 'vue'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const i18nStore = useI18nStore()
const settingsStore = useSettingsStore()
const { t, locale } = useI18n()

const { updateServiceWorker } = useRegisterSW()
const isCheckingForUpdate = vueRef(false)
const updateStatusMessage = vueRef('')

const currentLocale = computed(() => locale.value as SupportedLocale)

const userInfo = computed(() => ({
  name: authStore.user?.displayName || 'User',
  email: authStore.user?.email || '',
  photoURL: authStore.user?.photoURL || null
}))

const handleLanguageChange = async (newLocale: SupportedLocale) => {
  await i18nStore.setLocale(newLocale)
}

const handleThemeChange = async (newTheme: 'light' | 'dark') => {
  await themeStore.setTheme(newTheme)
}

const handleLogout = async () => {
  if (confirm(t('auth.confirmLogout') || 'Are you sure you want to log out?')) {
    try {
      await authStore.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }
}

const handleCheckForUpdates = async () => {
  try {
    isCheckingForUpdate.value = true
    updateStatusMessage.value = t('pwa.updateCheck')

    // Force check for updates by calling updateServiceWorker(true)
    // The virtue:pwa-register hook's updateServiceWorker(true) implementation
    // often handles the check and prompt.
    // However, some versions might need a specific reload or check mechanism.
    // Given the 'prompt' config, this should trigger the standard update flow.
    await updateServiceWorker(true)

    // If it doesn't reload immediately, wait a bit and show message
    setTimeout(() => {
        isCheckingForUpdate.value = false
        updateStatusMessage.value = t('pwa.noUpdate')
        setTimeout(() => { updateStatusMessage.value = '' }, 3000)
    }, 2000)
  } catch (error) {
    console.error('Update check failed:', error)
    isCheckingForUpdate.value = false
    updateStatusMessage.value = 'Update check failed'
  }
}
</script>

<template>
  <div class="app-layout">
    <!-- Desktop Sidebar -->
    <div class="desktop-sidebar">
      <AppSidebar />
    </div>

    <!-- Main Content Area -->
    <main class="main-content">
      <div class="content-wrapper">
        <div class="settings-view">
          <div class="settings-header">
            <button
              @click="router.push('/')"
              class="back-button mobile-only"
              :aria-label="t('common.back')"
            >
              <ArrowLeft :size="20" />
            </button>
            <h2 class="page-title">
              {{ t('settings.title') }}
            </h2>
          </div>

          <!-- User Profile Section -->
          <div class="settings-card">
            <div class="profile-info">
              <div class="profile-avatar-large">
                <img v-if="userInfo.photoURL" :src="userInfo.photoURL" alt="Profile" class="avatar-image" />
                <span v-else class="avatar-initials">{{ userInfo.name.charAt(0) }}</span>
              </div>
              <div class="profile-details">
                <h3 class="profile-name">{{ userInfo.name }}</h3>
                <p class="profile-email">{{ userInfo.email }}</p>
              </div>
            </div>
          </div>

          <!-- App Behavior -->
          <div class="settings-card">
            <div class="setting-header">
              <ListChecks :size="20" class="setting-icon" />
              <div class="setting-title-group">
                <h3 class="setting-title">{{ t('settings.threeStepProcess') }}</h3>
                <p class="setting-desc-inline">{{ t('settings.threeStepDesc') }}</p>
              </div>
            </div>
            <div class="button-group">
              <button
                @click="settingsStore.setThreeStepEnabled(false)"
                :class="['option-button', { active: !settingsStore.isThreeStepEnabled }]"
              >
                <span>{{ t('settings.disabled') }}</span>
              </button>
              <button
                @click="settingsStore.setThreeStepEnabled(true)"
                :class="['option-button', { active: settingsStore.isThreeStepEnabled }]"
              >
                <span>{{ t('settings.enabled') }}</span>
              </button>
            </div>
          </div>

          <!-- Theme Selection -->
          <div class="settings-card">
            <div class="setting-header">
              <Moon :size="20" class="setting-icon" />
              <h3 class="setting-title">{{ t('settings.theme') }}</h3>
            </div>
            <div class="button-group">
              <button
                @click="handleThemeChange('light')"
                :class="['option-button', { active: themeStore.theme === 'light' }]"
              >
                <Sun :size="18" />
                <span>{{ t('settings.light') }}</span>
              </button>
              <button
                @click="handleThemeChange('dark')"
                :class="['option-button', { active: themeStore.theme === 'dark' }]"
              >
                <Moon :size="18" />
                <span>{{ t('settings.dark') }}</span>
              </button>
            </div>
          </div>

          <!-- Language Selection -->
          <div class="settings-card">
            <div class="setting-header">
              <Globe :size="20" class="setting-icon" />
              <h3 class="setting-title">{{ t('settings.language') }}</h3>
            </div>
            <div class="button-group">
              <button
                @click="handleLanguageChange('en')"
                :class="['option-button', { active: currentLocale === 'en' }]"
              >
                <span>🇬🇧</span>
                <span>{{ t('settings.english') }}</span>
              </button>
              <button
                @click="handleLanguageChange('sv')"
                :class="['option-button', { active: currentLocale === 'sv' }]"
              >
                <span>🇸🇪</span>
                <span>{{ t('settings.swedish') }}</span>
              </button>
            </div>
          </div>

          <!-- Logout Section -->
          <div class="settings-card logout-section">
            <button @click="handleLogout" class="logout-button">
              <LogOut :size="20" />
              <span>{{ t('auth.signOut') || 'Log Out' }}</span>
            </button>
          </div>

          <!-- Update Section (Subtle) -->
          <div class="update-section">
            <button
              class="check-update-btn"
              @click="handleCheckForUpdates"
              :disabled="isCheckingForUpdate"
            >
              <RotateCcw :size="14" :class="{ 'spinning': isCheckingForUpdate }" />
              <span>{{ updateStatusMessage || t('pwa.checkForUpdate') }}</span>
            </button>
          </div>
        </div>
      </div>


      <!-- Mobile Bottom Nav -->
      <div class="mobile-only">
        <BottomNavigation />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-lighter);
}

.dark .app-layout {
  background: var(--color-bg-light);
}

.desktop-sidebar {
  display: none;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  width: 100%;
}

.mobile-only {
  display: block;
}

.settings-view {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 5rem;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.back-button {
  background: var(--color-bg-white);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  cursor: pointer;
  border: none;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .back-button {
  background: var(--color-bg-card);
}

.back-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

@media (min-width: 769px) {
  .desktop-sidebar {
    display: block;
    flex-shrink: 0;
  }

  .mobile-only {
    display: none;
  }

  .content-wrapper {
      padding: var(--spacing-2xl);
  }

  .settings-view {
    margin-top: var(--spacing-4xl);
  }
}


.settings-card {
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.dark .settings-card {
  background: var(--color-bg-card);
}

.profile-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.profile-avatar-large {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #6C5CE7 0%, #A78BFA 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  color: var(--color-text-white);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.profile-details {
  flex: 1;
}

.profile-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.profile-email {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.setting-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.setting-icon {
  color: var(--color-primary);
}

.setting-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.button-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.option-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
}

.option-button:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-lavender);
}

.option-button.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-white);
  box-shadow: var(--shadow-purple);
}



.setting-title-group {
  display: flex;
  flex-direction: column;
}

.setting-desc-inline {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.logout-section {
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.logout-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  border: 2px solid #EF4444;
  border-radius: var(--radius-md);
  background: transparent;
  color: #EF4444;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
}

.logout-button:hover {
  background: #FEE2E2;
  border-color: #DC2626;
  color: #DC2626;
}

.dark .logout-button:hover {
  background: rgba(239, 68, 68, 0.1);
}

.update-section {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-xl);
}

.check-update-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
}

.check-update-btn:hover:not(:disabled) {
  background: var(--color-bg-purple-tint);
  color: var(--color-primary);
}

.check-update-btn:disabled {
  cursor: default;
  opacity: 0.7;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
