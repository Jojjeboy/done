<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import LayoutWrapper from '@/components/Layout.vue'
import { useThemeStore } from '@/stores/theme'
import { useI18nStore } from '@/stores/i18n'
import { useI18n } from 'vue-i18n'
import { ArrowLeft } from 'lucide-vue-next'
import type { SupportedLocale } from '@/i18n'

const router = useRouter()
const themeStore = useThemeStore()
const i18nStore = useI18nStore()
const { t, locale } = useI18n()

const currentLocale = computed(() => locale.value as SupportedLocale)

const handleLanguageChange = async (newLocale: SupportedLocale) => {
  await i18nStore.setLocale(newLocale)
}

const handleThemeChange = async (newTheme: 'light' | 'dark') => {
  await themeStore.setTheme(newTheme)
}
</script>

<template>
  <LayoutWrapper>
    <div class="settings-view space-y-6">
      <div class="flex items-center gap-4 mb-8">
        <button
          @click="router.push('/')"
          class="soft-button p-2.5 text-soft dark:text-gray-200"
          :aria-label="t('common.back')"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h2 class="text-3xl font-bold text-soft dark:text-gray-200">
          {{ t('settings.title') }}
        </h2>
      </div>

      <!-- Language Selection -->
      <div class="soft-card space-y-4">
        <h3 class="text-xl font-semibold text-soft dark:text-gray-200">
          {{ t('settings.language') }}
        </h3>
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            @click="handleLanguageChange('en')"
            :class="[
              'soft-button flex-1 py-3 text-soft dark:text-gray-200',
              currentLocale === 'en' ? 'ring-2 ring-blue-500' : ''
            ]"
          >
            {{ t('settings.english') }}
          </button>
          <button
            @click="handleLanguageChange('sv')"
            :class="[
              'soft-button flex-1 py-3 text-soft dark:text-gray-200',
              currentLocale === 'sv' ? 'ring-2 ring-blue-500' : ''
            ]"
          >
            {{ t('settings.swedish') }}
          </button>
        </div>
      </div>

      <!-- Theme Selection -->
      <div class="soft-card space-y-4">
        <h3 class="text-xl font-semibold text-soft dark:text-gray-200">
          {{ t('settings.theme') }}
        </h3>
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            @click="handleThemeChange('light')"
            :class="[
              'soft-button flex-1 py-3 text-soft dark:text-gray-200',
              themeStore.theme === 'light' ? 'ring-2 ring-blue-500' : ''
            ]"
          >
            {{ t('settings.light') }}
          </button>
          <button
            @click="handleThemeChange('dark')"
            :class="[
              'soft-button flex-1 py-3 text-soft dark:text-gray-200',
              themeStore.theme === 'dark' ? 'ring-2 ring-blue-500' : ''
            ]"
          >
            {{ t('settings.dark') }}
          </button>
        </div>
      </div>
    </div>
  </LayoutWrapper>
</template>

<style scoped>
.settings-view {
  max-width: 800px;
  margin: 0 auto;
}
</style>
