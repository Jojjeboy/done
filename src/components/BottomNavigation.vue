<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Home, Plus, Settings, LayoutDashboard } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const emit = defineEmits<{
  openSearch: []
  openAddTask: []
}>()

const isActive = (path: string) => {
  return route.path === path
}

const addTask = () => {
  emit('openAddTask')
}
</script>

<template>
  <nav class="bottom-nav">
    <button @click="router.push('/')" class="nav-btn" :class="{ active: isActive('/') }"
      :aria-label="t('common.appName')">
      <Home :size="24" />
    </button>
    <button @click="router.push('/board')" class="nav-btn" :class="{ active: isActive('/board') }"
      :aria-label="t('common.board') || 'Board'">
      <LayoutDashboard :size="24" />
    </button>
    <button v-if="!isActive('/settings')" @click="addTask" class="nav-btn-add" :aria-label="t('tasks.addTask')">
      <Plus :size="28" />
    </button>
    <button @click="router.push('/settings')" class="nav-btn" :class="{ active: isActive('/settings') }"
      :aria-label="t('settings.title')">
      <Settings :size="24" />
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-xl);
  background: linear-gradient(to top, var(--color-bg-lavender) 0%, rgba(245, 243, 255, 0.95) 100%);
  backdrop-filter: blur(10px);
  z-index: 50;
  max-width: 768px;
  margin: 0 auto;
}

.dark .bottom-nav {
  background: linear-gradient(to top, rgba(108, 92, 231, 0.1) 0%, rgba(42, 42, 69, 0.95) 100%);
}

.nav-btn {
  background: transparent;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  padding: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  border-radius: var(--radius-md);
  opacity: 0.5;
}

.nav-btn:hover {
  opacity: 0.8;
  background-color: rgba(108, 92, 231, 0.1);
}

.nav-btn.active {
  opacity: 1;
  background-color: rgba(108, 92, 231, 0.15);
}

.nav-btn-add {
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  color: var(--color-text-white);
  cursor: pointer;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-purple);
  transition: all var(--transition-base);
  margin-top: -28px;
}

.nav-btn-add:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.25);
}

.nav-btn-add:active {
  transform: scale(0.95);
}
</style>
