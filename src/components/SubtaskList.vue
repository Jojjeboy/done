<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Check, ChevronRight } from 'lucide-vue-next'
import type { Subtask } from '@/types/todo'

const props = defineProps<{
  todoId?: string | null
  modelValue?: { title: string; completed: boolean; id: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { title: string; completed: boolean; id: string }[]]
}>()

const todoStore = useTodoStore()
const { t } = useI18n()

const newSubtaskTitle = ref('')
const isAdding = ref(false)
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// If todoId is present, we use store. If not, we use modelValue (local state)
const isLocalMode = computed(() => !props.todoId)

const subtasks = computed(() => {
  if (isLocalMode.value) {
    return props.modelValue || []
  }
  return todoStore.subtasksByTodoId.get(props.todoId!) || []
})

const incompleteSubtasks = computed(() => {
  return subtasks.value.filter(s => !s.completed)
})

const completedSubtasks = computed(() => {
  return subtasks.value.filter(s => s.completed)
})

const isCompletedOpen = ref(false)

const handleAddSubtask = async () => {
  if (!newSubtaskTitle.value.trim()) return

  try {
    isAdding.value = true
    const title = newSubtaskTitle.value.trim()

    if (isLocalMode.value) {
      const newSubtask = {
        id: crypto.randomUUID(), // Temp ID
        title,
        completed: false
      }
      emit('update:modelValue', [...(props.modelValue || []), newSubtask])
    } else {
      await todoStore.addSubtask(props.todoId!, title)
    }

    newSubtaskTitle.value = ''
  } catch (error) {
    console.error('Failed to add subtask:', error)
  } finally {
    isAdding.value = false
  }
}

const toggleSubtask = async (subtask: Subtask | { id: string; title: string; completed: boolean }) => {
  try {
    if (isLocalMode.value) {
      const updated = (props.modelValue || []).map(s =>
        s.id === subtask.id ? { ...s, completed: !s.completed } : s
      )
      emit('update:modelValue', updated)
    } else {
      await todoStore.updateSubtask(subtask.id, { completed: !subtask.completed })
    }
  } catch (error) {
    console.error('Failed to toggle subtask:', error)
  }
}

const deleteSubtask = async (subtaskId: string) => {
  try {
    if (isLocalMode.value) {
      const updated = (props.modelValue || []).filter(s => s.id !== subtaskId)
      emit('update:modelValue', updated)
    } else {
      await todoStore.deleteSubtask(subtaskId)
    }
  } catch (error) {
    console.error('Failed to delete subtask:', error)
  }
}

const startEditing = (subtask: { id: string; title: string }) => {
  editingId.value = subtask.id
  editingTitle.value = subtask.title
  nextTick(() => {
    editInputRef.value?.focus()
  })
}

const cancelEditing = () => {
  editingId.value = null
  editingTitle.value = ''
}

const saveEditing = async () => {
  if (!editingId.value || !editingTitle.value.trim()) {
    cancelEditing()
    return
  }

  try {
    if (isLocalMode.value) {
      const updated = (props.modelValue || []).map(s =>
        s.id === editingId.value ? { ...s, title: editingTitle.value.trim() } : s
      )
      emit('update:modelValue', updated)
    } else {
      await todoStore.updateSubtask(editingId.value, { title: editingTitle.value.trim() })
    }
    cancelEditing()
  } catch (error) {
    console.error('Failed to update subtask:', error)
  }
}
</script>

<template>
  <div class="subtask-list">
    <div class="subtask-header">
      <h3 class="subtask-title">{{ t('modal.subtasks') }}</h3>
    </div>

    <!-- Incomplete Subtasks -->
    <div v-if="incompleteSubtasks.length > 0" class="subtask-items">
      <div v-for="subtask in incompleteSubtasks" :key="subtask.id" class="subtask-item"
        :class="{ completed: subtask.completed }">
        <button @click="toggleSubtask(subtask)" class="subtask-checkbox">
          <div v-if="subtask.completed" class="check-circle-wrapper">
            <Check :size="12" class="check-icon-inner" />
          </div>
          <div v-else class="empty-circle"></div>
        </button>

        <div v-if="editingId === subtask.id" class="edit-wrapper">
          <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
            @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
        </div>
        <span v-else class="subtask-text" @click="startEditing(subtask)">
          {{ subtask.title }}
        </span>

        <button @click="deleteSubtask(subtask.id)" class="delete-btn">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <!-- Add Subtask Input -->
    <div class="add-subtask">
      <div class="input-wrapper">
        <Plus :size="16" class="plus-icon" />
        <input v-model="newSubtaskTitle" type="text" :placeholder="t('modal.addSubtask')" class="subtask-input"
          @keyup.enter="handleAddSubtask" />
      </div>
      <button v-if="newSubtaskTitle.trim()" @click="handleAddSubtask" class="add-btn" :disabled="isAdding">
        {{ t('common.add') }}
      </button>
    </div>

    <!-- Completed Subtasks Accordion -->
    <div v-if="completedSubtasks.length > 0" class="completed-accordion">
      <button class="accordion-header" @click="isCompletedOpen = !isCompletedOpen">
        <span class="accordion-title">{{ t('tasks.filters.completed') }} ({{ completedSubtasks.length }})</span>
        <div class="accordion-icon" :class="{ open: isCompletedOpen }">
          <ChevronRight :size="16" />
        </div>
      </button>

      <div v-if="isCompletedOpen" class="accordion-content">
        <div v-for="subtask in completedSubtasks" :key="subtask.id" class="subtask-item completed">
          <button @click="toggleSubtask(subtask)" class="subtask-checkbox">
            <div class="check-circle-wrapper">
              <Check :size="12" class="check-icon-inner" />
            </div>
          </button>

          <div v-if="editingId === subtask.id" class="edit-wrapper">
            <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
              @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
          </div>
          <span v-else class="subtask-text" @click="startEditing(subtask)">
            {{ subtask.title }}
          </span>

          <button @click="deleteSubtask(subtask.id)" class="delete-btn">
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
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
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.subtask-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  transition: all var(--transition-base);
  min-height: 32px;
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
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-radius: 50%;
  transition: all var(--transition-base);
}

.subtask-checkbox:hover .empty-circle {
  border-color: var(--color-primary);
}

.check-circle-wrapper {
  width: 16px;
  height: 16px;
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
  cursor: text;
}

.edit-wrapper {
  flex: 1;
}

.edit-input {
  width: 100%;
  font-size: var(--font-size-sm);
  padding: 2px 4px;
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  background: var(--color-bg-white);
  color: var(--color-text-primary);
  margin: -3px 0;
}

.edit-input:focus {
  outline: none;
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
  display: flex;
  align-items: center;
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
  padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) calc(var(--spacing-lg) + 8px);
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

/* Completed Accordion Styles */
.completed-accordion {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
}

.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: none;
  padding: var(--spacing-sm) 0;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.accordion-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.accordion-icon {
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
}

.accordion-icon.open {
  transform: rotate(90deg);
}

.accordion-content {
  margin-top: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
