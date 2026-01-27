<script setup lang="ts">
import { computed, ref as vueRef } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ColorPalette } from '@/stores/theme'
import { useI18nStore } from '@/stores/i18n'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeft, LogOut, Moon, Sun, Globe,
  ListChecks, RotateCcw, FileText, User,
  Palette, Zap, Info, ChevronRight, Star, BarChart
} from 'lucide-vue-next'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import type { SupportedLocale } from '@/i18n'

import ConfirmationModal from '@/components/ConfirmationModal.vue'
import type { CommitData } from '@/types/commit-info'
import commitData from '@/generated/commit-info.json'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const i18nStore = useI18nStore()
const settingsStore = useSettingsStore()
const { t, locale } = useI18n()

const { updateServiceWorker } = useRegisterSW()
const isCheckingForUpdate = vueRef(false)
const updateStatusMessage = vueRef('')
const showLogoutConfirm = vueRef(false)

const latestCommit = computed<CommitData>(() => commitData as CommitData)

const currentLocale = computed(() => locale.value as SupportedLocale)

const userInfo = computed(() => ({
  name: authStore.user?.displayName || t('common.user'),
  email: authStore.user?.email || '',
  photoURL: authStore.user?.photoURL || null
}))

const handleLanguageChange = async (newLocale: SupportedLocale) => {
  await i18nStore.setLocale(newLocale)
}

const handleThemeChange = async (newTheme: 'light' | 'dark') => {
  await themeStore.setTheme(newTheme)
}

const handleColorPaletteChange = async (palette: ColorPalette) => {
  await themeStore.setColorPalette(palette)
}

const handleLogoutClick = () => {
  showLogoutConfirm.value = true
}

const confirmLogout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  } finally {
    showLogoutConfirm.value = false
  }
}

const handleCheckForUpdates = async () => {
  try {
    isCheckingForUpdate.value = true
    updateStatusMessage.value = t('pwa.updateCheck')
    await updateServiceWorker(true)
    setTimeout(() => {
      isCheckingForUpdate.value = false
      updateStatusMessage.value = t('pwa.noUpdate')
      setTimeout(() => { updateStatusMessage.value = '' }, 3000)
    }, 2000)
  } catch (error) {
    console.error('Update check failed:', error)
    isCheckingForUpdate.value = false
    updateStatusMessage.value = t('pwa.updateError')
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
            <button @click="router.push('/')" class="back-button mobile-only" :aria-label="t('common.back')">
              <ArrowLeft :size="18" />
            </button>
            <h2 class="page-title">{{ t('settings.title') }}</h2>
          </div>

          <!-- Account Section -->
          <div class="settings-group">
            <div class="group-header">
              <User :size="16" />
              <span>{{ t('settings.account') }}</span>
            </div>
            <div class="settings-card profile-card">
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
          </div>

          <!-- Appearance Section -->
          <div class="settings-group">
            <div class="group-header">
              <Palette :size="16" />
              <span>{{ t('settings.appearance') }}</span>
            </div>
            <div class="settings-card list-card">
              <!-- Theme -->
              <div class="list-item">
                <div class="item-info">
                  <div class="item-icon-circle theme">
                    <Moon :size="16" />
                  </div>
                  <div class="item-text-group">
                    <span class="item-label">{{ t('settings.theme') }}</span>
                  </div>
                </div>
                <div class="segmented-control">
                  <button @click="handleThemeChange('light')"
                    :class="['segment-btn', { active: themeStore.theme === 'light' }]">
                    <Sun :size="14" />
                  </button>
                  <button @click="handleThemeChange('dark')"
                    :class="['segment-btn', { active: themeStore.theme === 'dark' }]">
                    <Moon :size="14" />
                  </button>
                </div>
              </div>

              <!-- Language -->
              <div class="list-divider"></div>
              <div class="list-item">
                <div class="item-info">
                  <div class="item-icon-circle lang">
                    <Globe :size="16" />
                  </div>
                  <div class="item-text-group">
                    <span class="item-label">{{ t('settings.language') }}</span>
                  </div>
                </div>
                <div class="segmented-control text-segments">
                  <button @click="handleLanguageChange('en')"
                    :class="['segment-btn', { active: currentLocale === 'en' }]">
                    <span>EN</span>
                  </button>
                  <button @click="handleLanguageChange('sv')"
                    :class="['segment-btn', { active: currentLocale === 'sv' }]">
                    <span>SV</span>
                  </button>
                </div>
              </div>

              <!-- Color Palette -->
              <div class="list-divider"></div>
              <div class="list-item column-layout">
                <div class="item-info">

                  <div class="item-text-group">
                    <span class="item-label">{{ t('settings.colorPalette') }}</span>
                  </div>
                </div>
                <div class="color-palette-grid">
                  <button v-for="palette in themeStore.getAvailablePalettes()" :key="palette"
                    @click="handleColorPaletteChange(palette)"
                    :class="['color-swatch', { active: themeStore.colorPalette === palette }]"
                    :style="{ backgroundColor: themeStore.getPaletteColors(palette).primary }"
                    :aria-label="t(`settings.colorPalettes.${palette}`)"
                    :title="t(`settings.colorPalettes.${palette}`)">
                    <span v-if="themeStore.colorPalette === palette" class="checkmark">✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Behavior Section -->
          <div class="settings-group">
            <div class="group-header">
              <Zap :size="16" />
              <span>{{ t('settings.behavior') }}</span>
            </div>
            <div class="settings-card list-card">
              <div class="list-item column-on-mobile">
                <div class="item-info">
                  <div class="item-icon-circle behavior">
                    <ListChecks :size="16" />
                  </div>
                  <div class="item-text-group">
                    <span class="item-label">{{ t('settings.threeStepProcess') }}</span>
                    <span class="item-desc">{{ t('settings.threeStepDesc') }}</span>
                  </div>
                </div>
                <div class="toggle-switch"
                  @click="settingsStore.setThreeStepEnabled(!settingsStore.isThreeStepEnabled)">
                  <div :class="['switch-track', { active: settingsStore.isThreeStepEnabled }]">
                    <div class="switch-thumb"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- About Section -->
          <div class="settings-group">
            <div class="group-header">
              <Info :size="16" />
              <span>{{ t('settings.about') }}</span>
            </div>
            <div class="settings-card list-card">
              <div class="list-item clickable" @click="router.push('/stats')">
                <div class="item-info">
                  <div class="item-icon-circle theme">
                    <BarChart :size="16" />
                  </div>
                  <div class="item-text-group">
                    <span class="item-label">{{ t('common.insights') }}</span>
                  </div>
                </div>
                <ChevronRight :size="18" class="chevron" />
              </div>
              <div class="list-divider"></div>
              <div class="list-item clickable" @click="handleCheckForUpdates">
                <div class="item-info">
                  <div class="item-icon-circle about">
                    <RotateCcw :size="16" :class="{ spinning: isCheckingForUpdate }" />
                  </div>
                  <div class="item-text-group">
                    <span class="item-label">{{ t('pwa.titleCheckForUpdate') }}</span>
                    <span class="item-desc" v-if="latestCommit.latest">{{ latestCommit.latest.message }}</span>
                  </div>
                </div>
                <div class="item-action">
                  <span class="status-msg" v-if="updateStatusMessage">{{ updateStatusMessage }}</span>
                  <ChevronRight v-else :size="18" class="chevron" />
                </div>
              </div>
              <div class="list-divider"></div>
              <div class="list-item clickable" @click="router.push('/features')">
                <div class="item-info">
                  <div class="item-icon-circle features">
                    <Star :size="16" />
                  </div>
                  <div class="item-text-group">
                    <span class="item-label">{{ t('common.features') }}</span>
                  </div>
                </div>
                <ChevronRight :size="18" class="chevron" />
              </div>
              <div class="list-divider"></div>
              <div class="list-item clickable" @click="router.push('/changelog')">
                <div class="item-info">
                  <div class="item-icon-circle changelog">
                    <FileText :size="16" />
                  </div>
                  <div class="item-text-group">
                    <span class="item-label">{{ t('pwa.viewChangelog') }}</span>
                  </div>
                </div>
                <ChevronRight :size="18" class="chevron" />
              </div>
            </div>
          </div>

          <!-- Sign Out Action -->
          <div class="actions-group">
            <button @click="handleLogoutClick" class="logout-link-btn">
              <LogOut :size="18" />
              <span>{{ t('auth.signOut') }}</span>
            </button>
          </div>

          <div class="version-footer">
            <span v-if="latestCommit.latest">Ver. {{ latestCommit.latest.hash.slice(0, 7) }}</span>
          </div>
        </div>
      </div>

      <!-- Mobile Bottom Nav -->
      <div class="mobile-only">
        <BottomNavigation />
      </div>
    </main>

    <ConfirmationModal :isOpen="showLogoutConfirm" :title="t('auth.signOut')" :message="t('auth.confirmLogout')"
      :confirmText="t('auth.signOut')" type="danger" @confirm="confirmLogout" @cancel="showLogoutConfirm = false" />
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
  padding: var(--spacing-md);
  width: 100%;
}

.mobile-only {
  display: block;
}

.settings-view {
  max-width: 540px;
  margin: 0 auto;
  padding-bottom: 5rem;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}

.back-button {
  background: var(--color-bg-white);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  box-shadow: var(--shadow-sm);
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
  box-shadow: var(--shadow-md);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 800;
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
    padding: var(--spacing-xl);
  }

  .settings-view {
    margin-top: var(--spacing-2xl);
  }
}

/* Settings Groups & Cards */
.settings-group {
  margin-bottom: var(--spacing-2xl);
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-left: 4px;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.settings-card {
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  border: 1px solid var(--color-border-light);
}

.dark .settings-card {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.profile-card {
  padding: var(--spacing-lg);
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
  background: linear-gradient(135deg, var(--color-primary) 0%, #A78BFA 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border: 3px solid var(--color-bg-white);
  box-shadow: var(--shadow-md);
}

.dark .profile-avatar-large {
  border-color: var(--color-bg-card);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  color: white;
  font-size: 1.5rem;
  font-weight: 800;
}

.profile-name {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.profile-email {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* List Items */
.list-card {
  display: flex;
  flex-direction: column;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  transition: background 0.2s;
}

.list-item.clickable {
  cursor: pointer;
}

.list-item.clickable:hover {
  background: var(--color-bg-lighter);
}

.dark .list-item.clickable:hover {
  background: rgba(255, 255, 255, 0.03);
}

.item-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex: 1;
}

.item-icon-circle {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon-circle.theme {
  background: #E0E7FF;
  color: #4F46E5;
}

.item-icon-circle.lang {
  background: #ECFDF5;
  color: #10B981;
}

.item-icon-circle.behavior {
  background: #FFF7ED;
  color: #F97316;
}

.item-icon-circle.about {
  background: #F5F3FF;
  color: #8B5CF6;
}

.item-icon-circle.changelog {
  background: #F9FAFB;
  color: #6B7280;
}

.item-icon-circle.features {
  background: #FEF3C7;
  color: #D97706;
}

.dark .item-icon-circle.theme {
  background: rgba(79, 70, 229, 0.15);
}

.dark .item-icon-circle.lang {
  background: rgba(16, 185, 129, 0.15);
}

.dark .item-icon-circle.behavior {
  background: rgba(249, 115, 22, 0.15);
}

.dark .item-icon-circle.about {
  background: rgba(139, 92, 246, 0.15);
}

.dark .item-icon-circle.changelog {
  background: rgba(107, 114, 128, 0.15);
}

.dark .item-icon-circle.features {
  background: rgba(217, 119, 6, 0.15);
}

.item-text-group {
  display: flex;
  flex-direction: column;
}

.item-label {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.item-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  line-height: 1.4;
}

.list-divider {
  height: 1px;
  background: var(--color-border-light);
  margin-left: calc(var(--spacing-lg) + 36px + var(--spacing-md));
}

.dark .list-divider {
  background: var(--color-bg-light);
}

.chevron {
  color: var(--color-text-muted);
}

/* Segmented Control */
.segmented-control {
  display: flex;
  background: var(--color-bg-lighter);
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--color-border-light);
}

.dark .segmented-control {
  background: var(--color-bg-light);
  border-color: var(--color-border);
}

.segment-btn {
  border: none;
  background: transparent;
  width: 40px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 0.2s;
}

.text-segments .segment-btn {
  width: 48px;
  font-size: 0.75rem;
  font-weight: 700;
}

.segment-btn.active {
  background: var(--color-bg-white);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.dark .segment-btn.active {
  background: var(--color-bg-card);
}

/* Toggle Switch */
.toggle-switch {
  cursor: pointer;
  user-select: none;
}

.switch-track {
  width: 44px;
  height: 24px;
  background: var(--color-bg-lighter);
  border-radius: 100px;
  position: relative;
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--color-border-light);
}

.dark .switch-track {
  background: var(--color-bg-light);
  border-color: var(--color-border);
}

.switch-track.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.switch-thumb {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 3px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
}

.active .switch-thumb {
  transform: translateX(19px);
}

/* Actions Group */
.actions-group {
  margin-top: var(--spacing-xl);
}

.logout-link-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: var(--spacing-lg);
  background: transparent;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-xl);
  color: #EF4444;
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--color-bg-white);
}

.dark .logout-link-btn {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.logout-link-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

.dark .logout-link-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.status-msg {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 600;
}

.spinning {
  animation: spin 1s linear infinite;
}

.version-footer {
  text-align: center;
  margin-top: var(--spacing-xl);
  font-size: 0.7rem;
  color: var(--color-text-muted);
  font-weight: 500;
  letter-spacing: 0.05em;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Mobile Adjustments */
@media (max-width: 600px) {
  .column-on-mobile {
    flex-direction: row;
    /* Keep behavior switch in one row */
    align-items: center;
  }
}

/* Color Palette Selector */
.column-layout {
  flex-direction: column;
  align-items: flex-start !important;
  gap: var(--spacing-md);
}

.color-palette-grid {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
  flex-wrap: wrap;
}

.color-swatch {
  width: 32px;
  height: 32px;
  min-height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: var(--shadow-sm);
}

.color-swatch:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-md);
}

.color-swatch.active {
  border-color: var(--color-text-primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.2);
  transform: scale(1.15);
}

.dark .color-swatch.active {
  border-color: var(--color-text-white);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
}

.color-swatch .checkmark {
  color: white;
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.item-icon-circle.palette {
  background: linear-gradient(135deg, #6c5ce7, #f43f5e);
  color: white;
}

.dark .item-icon-circle.palette {
  background: linear-gradient(135deg, #6c5ce7, #f43f5e);
}

@media (max-width: 600px) {
  .color-palette-grid {
    gap: 10px;
  }
}
</style>
