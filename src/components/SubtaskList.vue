<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { Plus, Trash2, Check, ChevronRight, CornerDownRight, ArrowRightLeft } from 'lucide-vue-next'
import MoveSubtaskModal from './MoveSubtaskModal.vue'

const props = defineProps<{
  todoId?: string | null
  modelValue?: { title: string; completed: boolean; id: string; parentId?: string | null }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { title: string; completed: boolean; id: string; parentId?: string | null }[]]
}>()

const todoStore = useTodoStore()
const { t } = useI18n()

// Parsing local vs store
const isLocalMode = computed(() => !props.todoId)

const allSubtasks = computed(() => {
  if (isLocalMode.value) {
    return props.modelValue || []
  }
  return todoStore.subtasksByTodoId.get(props.todoId!) || []
})

// Grouping
const incompleteParents = computed(() => {
  return allSubtasks.value.filter(s => !s.parentId && !s.completed)
})

const completedParents = computed(() => {
  return allSubtasks.value.filter(s => !s.parentId && s.completed)
})

const getChildren = (parentId: string) => {
  return allSubtasks.value.filter(s => s.parentId === parentId)
}

// State
const newSubtaskTitle = ref('') // Top level input
const isAddingKey = ref(false)

// Sub-adding
const addingToParentId = ref<string | null>(null)
const newSubSubtaskTitle = ref('')
const subSubInputRef = ref<HTMLInputElement | null>(null)

// Editing
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// Expanding
const expandedParents = ref<Set<string>>(new Set())
const isCompletedOpen = ref(false)

const toggleExpand = (id: string) => {
  if (expandedParents.value.has(id)) {
    expandedParents.value.delete(id)
  } else {
    expandedParents.value.add(id)
  }
}

const isExpanded = (id: string) => expandedParents.value.has(id)

// Moving
const isMoveModalOpen = ref(false)
const subtaskToMove = ref<{ id: string, title: string } | null>(null)

const openMoveModal = (subtask: { id: string, title: string }) => {
  subtaskToMove.value = subtask
  isMoveModalOpen.value = true
}

const handleMove = async (targetTodoId: string) => {
  if (!subtaskToMove.value) return

  try {
    await todoStore.reparentSubtask(subtaskToMove.value.id, targetTodoId)
    isMoveModalOpen.value = false
    subtaskToMove.value = null
  } catch (e) {
    console.error('Failed to move subtask', e)
  }
}

// Actions
const handleAddSubtask = async (parentId: string | null = null) => {
  const title = parentId ? newSubSubtaskTitle.value.trim() : newSubtaskTitle.value.trim()
  if (!title) return

  try {
    if (parentId) {
      // Adding sub-subtask
    } else {
      isAddingKey.value = true
    }

    if (isLocalMode.value) {
      const newSubtask = {
        id: crypto.randomUUID(),
        title,
        completed: false,
        parentId
      }
      emit('update:modelValue', [...(props.modelValue || []), newSubtask])
    } else {
      await todoStore.addSubtask(props.todoId!, title, parentId)
    }

    if (parentId) {
      newSubSubtaskTitle.value = ''
      addingToParentId.value = null
      // Ensure parent is expanded
      expandedParents.value.add(parentId)
    } else {
      newSubtaskTitle.value = ''
    }
  } catch (error) {
    console.error('Failed to add subtask:', error)
  } finally {
    isAddingKey.value = false
  }
}

const startAddingSubSubtask = (parentId: string) => {
  addingToParentId.value = parentId
  newSubSubtaskTitle.value = ''
  expandedParents.value.add(parentId)
  nextTick(() => {
    subSubInputRef.value?.focus()
  })
}

const toggleSubtask = async (subtask: { id: string; completed: boolean; parentId?: string | null }) => {
  try {
    if (isLocalMode.value) {
      let updated = [...(props.modelValue || [])]
      const sIndex = updated.findIndex(s => s.id === subtask.id)
      if (sIndex === -1) return

      const item = updated[sIndex]
      if (!item) return

      const newCompleted = !item.completed
      updated[sIndex] = {
        title: item.title,
        completed: newCompleted,
        id: item.id,
        parentId: item.parentId
      }

      // Cascade down
      if (!subtask.parentId) {
        updated = updated.map(s => {
          if (s.parentId === subtask.id) {
            return {
              title: s.title,
              completed: newCompleted,
              id: s.id,
              parentId: s.parentId
            }
          }
          return s
        })
      }
      // Cascade up
      else if (subtask.parentId) {
        if (!newCompleted) {
          const pIndex = updated.findIndex(s => s.id === subtask.parentId)
          if (pIndex !== -1) {
            const p = updated[pIndex]
            if (p) updated[pIndex] = { title: p.title, completed: false, id: p.id, parentId: p.parentId }
          }
        } else {
          const siblings = updated.filter(s => s.parentId === subtask.parentId && s.id !== subtask.id)
          if (siblings.every(s => s.completed)) {
            const pIndex = updated.findIndex(s => s.id === subtask.parentId)
            if (pIndex !== -1) {
              const p = updated[pIndex]
              if (p) updated[pIndex] = { title: p.title, completed: true, id: p.id, parentId: p.parentId }
            }
          }
        }
      }

      emit('update:modelValue', updated)
    } else {
      // Store handles logic
      await todoStore.toggleSubtask(subtask.id)
    }
  } catch (error) {
    console.error('Failed to toggle subtask:', error)
  }
}

const deleteSubtask = async (subtaskId: string) => {
  try {
    if (isLocalMode.value) {
      // Cascade delete
      const children = (props.modelValue || []).filter(s => s.parentId === subtaskId)
      const idsToDelete = [subtaskId, ...children.map(c => c.id)]
      const updated = (props.modelValue || []).filter(s => !idsToDelete.includes(s.id))
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
      const updated = (props.modelValue || []).map(s => s.id === editingId.value ? { ...s, title: editingTitle.value.trim() } : s)
      emit('update:modelValue', updated)
    } else {
      await todoStore.updateSubtask(editingId.value, { title: editingTitle.value.trim() })
    }
    cancelEditing()
  } catch (e) {
    console.error('Failed to update subtask', e)
  }
}
</script>

<template>
  <div class="subtask-list">
    <div class="subtask-header">
      <h3 class="subtask-title">{{ t('modal.subtasks') }}</h3>
    </div>

    <!-- Incomplete Parents -->
    <div v-if="incompleteParents.length > 0" class="subtask-items">
      <div v-for="parent in incompleteParents" :key="parent.id" class="parent-group">
        <!-- Parent Row -->
        <div class="subtask-item parent-item">
          <!-- Expand/Collapse for Parents with children -->
          <button class="expand-btn" :class="{ invisible: getChildren(parent.id).length === 0 }"
            @click="toggleExpand(parent.id)">
            <ChevronRight :size="16" class="chevron" :class="{ open: isExpanded(parent.id) }" />
          </button>

          <button @click="toggleSubtask(parent)" class="subtask-checkbox">
            <div class="empty-circle"></div>
          </button>

          <div v-if="editingId === parent.id" class="edit-wrapper">
            <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
              @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
          </div>
          <span v-else class="subtask-text" @click="startEditing(parent)">{{ parent.title }}</span>

          <!-- Add Sub-subtask Action -->
          <button class="action-btn add-child-btn" @click="startAddingSubSubtask(parent.id)"
            :title="t('modal.addSubtask')">
            <Plus :size="14" />
          </button>

          <button v-if="!isLocalMode" class="action-btn move-btn" @click="openMoveModal(parent)"
            :title="t('modal.moveSubtask')">
            <ArrowRightLeft :size="14" />
          </button>

          <button @click="deleteSubtask(parent.id)" class="action-btn delete-btn">
            <Trash2 :size="14" />
          </button>
        </div>

        <!-- Children Row (Indented) -->
        <div v-if="isExpanded(parent.id) || addingToParentId === parent.id" class="children-container">
          <div v-for="child in getChildren(parent.id)" :key="child.id" class="subtask-item child-item"
            :class="{ completed: child.completed }">
            <div class="indent-line">
              <CornerDownRight :size="14" class="corner-icon" />
            </div>
            <button @click="toggleSubtask(child)" class="subtask-checkbox">
              <div v-if="child.completed" class="check-circle-wrapper small">
                <Check :size="10" class="check-icon-inner" />
              </div>
              <div v-else class="empty-circle small"></div>
            </button>

            <div v-if="editingId === child.id" class="edit-wrapper">
              <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
                @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
            </div>
            <span v-else class="subtask-text" @click="startEditing(child)">{{ child.title }}</span>

            <button v-if="!isLocalMode" class="action-btn move-btn" @click="openMoveModal(child)"
              :title="t('modal.moveSubtask')">
              <ArrowRightLeft :size="14" />
            </button>
            <button @click="deleteSubtask(child.id)" class="action-btn delete-btn">
              <Trash2 :size="14" />
            </button>
          </div>

          <!-- Input for new child -->
          <div v-if="addingToParentId === parent.id" class="subtask-item child-item adding-row">
            <div class="indent-line"></div>
            <input ref="subSubInputRef" v-model="newSubSubtaskTitle" class="child-input"
              :placeholder="t('modal.addSubtask')" @keyup.enter="handleAddSubtask(parent.id)"
              @blur="addingToParentId = null" @keyup.escape="addingToParentId = null" />
          </div>
        </div>
      </div>
    </div>

    <!-- Add Top Level Subtask Input -->
    <div class="add-subtask">
      <div class="input-wrapper">
        <Plus :size="16" class="plus-icon" />
        <input v-model="newSubtaskTitle" type="text" :placeholder="t('modal.addSubtask')" class="subtask-input"
          @keyup.enter="handleAddSubtask(null)" />
      </div>
      <button v-if="newSubtaskTitle.trim()" @click="handleAddSubtask(null)" class="add-btn" :disabled="isAddingKey">
        {{ t('common.add') }}
      </button>
    </div>

    <!-- Completed Parents Accordion -->
    <div v-if="completedParents.length > 0" class="completed-accordion">
      <button class="accordion-header" @click="isCompletedOpen = !isCompletedOpen">
        <span class="accordion-title">{{ t('tasks.filters.completed') }} ({{ completedParents.length }})</span>
        <div class="accordion-icon" :class="{ open: isCompletedOpen }">
          <ChevronRight :size="16" />
        </div>
      </button>

      <div v-if="isCompletedOpen" class="accordion-content">
        <div v-for="parent in completedParents" :key="parent.id" class="parent-group completed-group">
          <div class="subtask-item parent-item completed">
            <button class="expand-btn" :class="{ invisible: getChildren(parent.id).length === 0 }"
              @click="toggleExpand(parent.id)">
              <ChevronRight :size="16" class="chevron" :class="{ open: isExpanded(parent.id) }" />
            </button>

            <button @click="toggleSubtask(parent)" class="subtask-checkbox">
              <div class="check-circle-wrapper">
                <Check :size="12" class="check-icon-inner" />
              </div>
            </button>

            <div v-if="editingId === parent.id" class="edit-wrapper">
              <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
                @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
            </div>
            <span v-else class="subtask-text" @click="startEditing(parent)">{{ parent.title }}</span>

            <button v-if="!isLocalMode" class="action-btn move-btn" @click="openMoveModal(parent)"
              :title="t('modal.moveSubtask')">
              <ArrowRightLeft :size="14" />
            </button>
            <button @click="deleteSubtask(parent.id)" class="action-btn delete-btn">
              <Trash2 :size="14" />
            </button>
          </div>

          <!-- Children of completed parents -->
          <div v-if="isExpanded(parent.id)" class="children-container">
            <div v-for="child in getChildren(parent.id)" :key="child.id" class="subtask-item child-item completed">
              <div class="indent-line"></div>
              <button @click="toggleSubtask(child)" class="subtask-checkbox">
                <div class="check-circle-wrapper small">
                  <Check :size="10" class="check-icon-inner" />
                </div>
              </button>
              <span class="subtask-text">{{ child.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Move Modal -->
    <MoveSubtaskModal v-if="!isLocalMode && props.todoId" :is-open="isMoveModalOpen" :current-todo-id="props.todoId"
      :subtask-title="subtaskToMove?.title || ''" @close="isMoveModalOpen = false" @move="handleMove" />
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

/* Parent Group & Items */
.parent-group {
  display: flex;
  flex-direction: column;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) 0;
  transition: all var(--transition-base);
  min-height: 32px;
}

.parent-item {
  font-weight: 500;
}

.child-item {
  padding-left: 0;
  /* Indentation handled by indent-line */
  font-size: 0.9em;
}

.children-container {
  display: flex;
  flex-direction: column;
  margin-left: 28px;
  /* Align under text */
  padding-left: 0;
}

.indent-line {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  opacity: 0.5;
}

.corner-icon {
  color: var(--color-text-muted);
}

/* Checkboxes */
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

.empty-circle.small {
  width: 14px;
  height: 14px;
  border-width: 1.5px;
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

.check-circle-wrapper.small {
  width: 14px;
  height: 14px;
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

/* Actions */
.action-btn {
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

.subtask-item:hover .action-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #EF4444;
}

.add-child-btn:hover {
  color: var(--color-primary);
}

.move-btn:hover {
  color: var(--color-primary);
}

/* Expand Btn */
.expand-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  width: 20px;
  justify-content: center;
}

.expand-btn.invisible {
  visibility: hidden;
}

.chevron {
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(90deg);
}


/* Add Main Subtask */
.add-subtask {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-top: 8px;
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

.child-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  padding: 4px 0;
  font-size: 0.9em;
  color: var(--color-text-primary);
}

.child-input:focus {
  outline: none;
  border-bottom-color: var(--color-primary);
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
