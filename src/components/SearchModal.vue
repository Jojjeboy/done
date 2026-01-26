<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

import { useRouter } from 'vue-router'

const emit = defineEmits<{
  close: []
}>()

const todoStore = useTodoStore()
const { t } = useI18n()
const router = useRouter()
const searchQuery = ref('')

const filteredTasks = computed(() => {
  if (!searchQuery.value.trim()) {
    return []
  }

  const query = searchQuery.value.toLowerCase()
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const results: any[] = []

  // Search through all items
  todoStore.allItems.forEach((item) => {
    if (item.title.toLowerCase().includes(query)) {
      results.push({
        type: 'task',
        title: item.title,
        id: item.id,
      })
    }
  })

  return results
})

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="search-modal-overlay" @click="handleClose">
    <div class="search-modal-content" @click.stop>
      <div class="search-header">
        <input v-model="searchQuery" type="text" :placeholder="t('search.placeholder')" class="search-input" autofocus
          @keyup.esc="handleClose" />
        <button @click="handleClose" class="close-btn" :aria-label="t('common.close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div v-if="searchQuery.trim()" class="search-results">
        <div v-if="filteredTasks.length === 0" class="no-results">
          {{ t('search.noResults') }}
        </div>
        <div v-else class="results-list">
          <div v-for="task in filteredTasks" :key="task.id" class="result-item"
            @click="router.push(`/task/${task.id}`); handleClose()">
            <div class="result-title">{{ task.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.search-modal-content {
  background: white;
  flex-direction: column;
  display: flex;
  max-height: 80vh;
  animation: slideUp 0.3s ease;
}

.dark .search-modal-content {
  background-color: #1a1a1a;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}

.search-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.dark .search-header {
  border-bottom-color: #374151;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  background: #f9fafb;
  color: #1a1a1a;
}

.dark .search-input {
  background-color: #2a2a2a;
  border-color: #374151;
  color: #f9fafb;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #1a1a1a;
}

.dark .close-btn:hover {
  color: #f9fafb;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.no-results {
  text-align: center;
  color: #6b7280;
  padding: 2rem 1rem;
}

.dark .no-results {
  color: #9ca3af;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-item {
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 0.5rem;
}

.dark .result-item {
  background: #2a2a2a;
}

.result-item:hover {
  background: #f3f4f6;
}

.dark .result-item:hover {
  background: #3a3a3a;
}

.result-title {
  color: #1a1a1a;
  font-weight: 500;
}

.dark .result-title {
  color: #f9fafb;
}
</style>
