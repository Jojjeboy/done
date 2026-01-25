<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Check } from 'lucide-vue-next'

const props = defineProps<{
  todoId: string
}>()

const todoStore = useTodoStore()
const { t } = useI18n()

const newSubtaskTitle = ref('')
const isAdding = ref(false)

const subtasks = computed(() => {
  return todoStore.subtasksByTodoId.get(props.todoId) || []
})

const handleAddSubtask = async () => {
  if (!newSubtaskTitle.value.trim()) return

  try {
    isAdding.value = true
    await todoStore.addSubtask(props.todoId, newSubtaskTitle.value.trim())
    newSubtaskTitle.value = ''
  } catch (error) {
    console.error('Failed to add subtask:', error)
  } finally {
    isAdding.value = false
  }
}

const toggleSubtask = async (subtaskId: string, completed: boolean) => {
  try {
    await todoStore.updateSubtask(subtaskId, { completed: !completed })
  } catch (error) {
    console.error('Failed to toggle subtask:', error)
  }
}

const deleteSubtask = async (subtaskId: string) => {
  try {
    await todoStore.deleteSubtask(subtaskId)
  } catch (error) {
    console.error('Failed to delete subtask:', error)
  }
}
</script>

<template>
  <div class="subtask-list">
    <div class="subtask-header">
      <h3 class="subtask-title">{{ t('modal.subtasks') }}</h3>
    </div>

    <div v-if="subtasks.length > 0" class="subtask-items">
      <div
        v-for="subtask in subtasks"
        :key="subtask.id"
        class="subtask-item"
        :class="{ completed: subtask.completed }"
      >
        <button
          @click="toggleSubtask(subtask.id, subtask.completed)"
          class="subtask-checkbox"
        >
          <div v-if="subtask.completed" class="check-circle-wrapper">
            <Check :size="12" class="check-icon-inner" />
          </div>
          <div v-else class="empty-circle"></div>
        </button>
        <span class="subtask-text">{{ subtask.title }}</span>
        <button @click="deleteSubtask(subtask.id)" class="delete-btn">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <div class="add-subtask">
      <div class="input-wrapper">
        <Plus :size="16" class="plus-icon" />
        <input
          v-model="newSubtaskTitle"
          type="text"
          :placeholder="t('modal.addSubtask')"
          class="subtask-input"
          @keyup.enter="handleAddSubtask"
        />
      </div>
      <button
        v-if="newSubtaskTitle.trim()"
        @click="handleAddSubtask"
        class="add-btn"
        :disabled="isAdding"
      >
        {{ t('common.add') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.subtask-list {
  margin-top: var(--spacing-xl);
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--spacing-lg);
}

.subtask-header {
  margin-bottom: var(--spacing-md);
}

.subtask-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.subtask-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  transition: all var(--transition-base);
}

.subtask-checkbox {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.empty-circle {
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-radius: 50%;
  transition: all var(--transition-base);
}

.subtask-checkbox:hover .empty-circle {
  border-color: var(--color-primary);
}

.check-circle-wrapper {
  width: 18px;
  height: 18px;
  background-color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon-inner {
  color: white;
}

.subtask-text {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}

.subtask-item.completed .subtask-text {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.delete-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  opacity: 0;
  transition: all var(--transition-base);
  padding: var(--spacing-xs);
}

.subtask-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #EF4444;
}

.add-subtask {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.plus-icon {
  position: absolute;
  left: var(--spacing-sm);
  color: var(--color-text-muted);
  pointer-events: none;
}

.subtask-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) calc(var(--spacing-lg) + 12px);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: var(--color-bg-lavender);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}

.subtask-input:focus {
  outline: none;
  background: var(--color-bg-white);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
}

.dark .subtask-input {
  background: rgba(255, 255, 255, 0.05);
}

.dark .subtask-input:focus {
  background: var(--color-bg-card);
}

.add-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-lavender);
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-base);
}

.add-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
