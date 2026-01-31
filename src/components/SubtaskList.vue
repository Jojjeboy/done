<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import type { Subtask } from '@/types/todo'
import { Plus, Trash2, Check, ChevronRight, CornerDownRight, ArrowRightLeft, GripVertical, ArrowUp } from 'lucide-vue-next'
import MoveSubtaskModal from './MoveSubtaskModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'

const props = defineProps<{
  todoId?: string | null
  modelValue?: (Partial<Subtask> & { id: string; title: string; completed: boolean; order: number; status?: 'pending' | 'in-progress' | 'completed' })[]
  processEnabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: (Partial<Subtask> & { id: string; title: string; completed: boolean; order: number })[]]
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
const isSubmittingSubtask = ref(false)
const addingToParentId = ref<string | null>(null)
const newSubSubtaskTitles = ref<Record<string, string>>({})
const mainInputRef = ref<{ focus: () => void } | null>(null)

// Editing
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

// Expanding
const expandedParents = ref<Set<string>>(new Set())
const isCompletedOpen = ref(false)

const expandAllParents = () => {
  allSubtasks.value.forEach(s => {
    if (!s.parentId) {
      const hasChildren = getChildren(s.id).length > 0
      if (hasChildren) {
        expandedParents.value.add(s.id)
      }
    }
  })
}

const isExpanded = (id: string) => expandedParents.value.has(id)

const toggleExpand = (id: string) => {
  if (expandedParents.value.has(id)) {
    expandedParents.value.delete(id)
  } else {
    expandedParents.value.add(id)
  }
}

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

// Drag and Drop for sorting
const draggedSubtaskIndex = ref<number | null>(null)
const draggedListType = ref<'incomplete' | 'completed' | null>(null)

const handleDragStart = (e: DragEvent, index: number, type: 'incomplete' | 'completed') => {
  draggedSubtaskIndex.value = index
  draggedListType.value = type
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault() // Allow drop
}

const handleDrop = async (targetIndex: number, type: 'incomplete' | 'completed') => {
  if (draggedSubtaskIndex.value === null || draggedListType.value !== type) return
  if (draggedSubtaskIndex.value === targetIndex) return

  const list = type === 'incomplete' ? [...incompleteParents.value] : [...completedParents.value]
  const [removed] = list.splice(draggedSubtaskIndex.value, 1) as (Partial<Subtask> & { id: string; title: string; completed: boolean; order: number })[]
  if (!removed) return
  list.splice(targetIndex, 0, removed)

  // Update order property for affected items
  const updatedSubtasks = list.map((s, idx) => ({ ...s, order: idx }))

  if (isLocalMode.value) {
    const otherSubtasks = (props.modelValue || []).filter(s => s.parentId || (type === 'incomplete' ? s.completed : !s.completed))
    emit('update:modelValue', [...otherSubtasks, ...updatedSubtasks])
  } else {
    try {
      await todoStore.updateSubtasksOrder(updatedSubtasks as Subtask[])
    } catch (e) {
      console.error('Failed to update order', e)
    }
  }

  draggedSubtaskIndex.value = null
  draggedListType.value = null
}
onMounted(() => {
  expandAllParents()
})

watch(() => props.todoId, () => {
  expandAllParents()
})

watch(() => allSubtasks.value, () => {
  expandAllParents()
}, { deep: true })

// Actions
const focusSubSubInput = (parentId: string) => {
  nextTick(() => {
    const inputs = document.querySelectorAll(`.child-input[data-parent="${parentId}"]`) as NodeListOf<HTMLInputElement>
    if (inputs.length > 0 && inputs[0]) {
      inputs[0].focus()
    }
  })
}

const handleAddSubtask = async (parentId: string | null = null) => {
  const title = parentId ? (newSubSubtaskTitles.value[parentId] || '').trim() : newSubtaskTitle.value.trim()
  if (!title) {
    // If empty title and adding sub-subtask transparently, maybe close?
    // Users might hit enter to close.
    if (parentId) {
      addingToParentId.value = null
    }
    return
  }

  // Prevent blur from closing
  if (parentId) {
    isSubmittingSubtask.value = true
  }

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
        parentId,
        order: (props.modelValue?.length || 0)
      } as Partial<Subtask> & { id: string; title: string; completed: boolean; order: number }
      emit('update:modelValue', [...(props.modelValue || []), newSubtask])
    } else {
      await todoStore.addSubtask(props.todoId!, title, parentId)
    }

    if (parentId) {
      newSubSubtaskTitles.value[parentId] = ''
      // Re-focus for continuous entry
      focusSubSubInput(parentId)
      // Reset flag after focus is restored
      setTimeout(() => {
        isSubmittingSubtask.value = false
      }, 100)
    } else {
      newSubtaskTitle.value = ''
      nextTick(() => {
        mainInputRef.value?.focus()
      })
    }
  } catch (error) {
    console.error('Failed to add subtask:', error)
    if (parentId) isSubmittingSubtask.value = false
  } finally {
    if (!parentId) isAddingKey.value = false
  }
}

const startAddingSubSubtask = (parentId: string) => {
  addingToParentId.value = parentId
  if (!newSubSubtaskTitles.value[parentId]) {
    newSubSubtaskTitles.value[parentId] = ''
  }
  expandedParents.value.add(parentId)
  focusSubSubInput(parentId)
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
      updated[sIndex] = { ...item, completed: newCompleted }

      // Cascade down
      if (!subtask.parentId) {
        updated = updated.map(s => {
          if (s.parentId === subtask.id) {
            return { ...s, completed: newCompleted }
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
            if (p) updated[pIndex] = { ...p, completed: false, status: 'in-progress' }
          }
        } else {
          const siblings = updated.filter(s => s.parentId === subtask.parentId && s.id !== subtask.id)
          if (siblings.every(s => s.completed)) {
            const pIndex = updated.findIndex(s => s.id === subtask.parentId)
            if (pIndex !== -1) {
              const p = updated[pIndex]
              if (p) updated[pIndex] = { ...p, completed: true, status: 'completed' }
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

const handleIndent = async (subtask: Subtask, index: number) => {
  // Find predecessor in the *incompleteParents* list (assuming we are in that list currently)
  if (index <= 0) return

  const prevSibling = incompleteParents.value[index - 1]
  if (!prevSibling) return

  try {
    if (isLocalMode.value) {
      const updated = [...(props.modelValue || [])]
      const sIndex = updated.findIndex(s => s.id === subtask.id)
      if (sIndex !== -1) {
        updated[sIndex] = { ...updated[sIndex], parentId: prevSibling.id } as Partial<Subtask> & { id: string; title: string; completed: boolean; order: number }
        emit('update:modelValue', updated)
      }
    } else {
      // Update parentId
      await todoStore.updateSubtask(subtask.id, { parentId: prevSibling.id })
      // Also expand the new parent so we see the moved item
      expandedParents.value.add(prevSibling.id)
    }
  } catch (e) {
    console.error('Failed to indent subtask', e)
  }
}

// Promoting / Converting
const showConvertConfirm = ref(false)
const subtaskToConvert = ref<Subtask | null>(null)

const handlePromoteSubtask = async (subtask: Subtask) => {
  // "Red Ring" action: Promote child to top-level subtask
  try {
    if (isLocalMode.value) {
      const updated = [...(props.modelValue || [])]
      const sIndex = updated.findIndex(s => s.id === subtask.id)
      if (sIndex !== -1) {
        updated[sIndex] = { ...updated[sIndex], parentId: null } as Partial<Subtask> & { id: string; title: string; completed: boolean; order: number }
        emit('update:modelValue', updated)
      }
    } else {
      // Expand the subtask itself if it has children?
      // When moved to top, it might have children.
      await todoStore.updateSubtask(subtask.id, { parentId: null })
    }
  } catch (e) {
    console.error('Failed to promote subtask', e)
  }
}

const confirmConvert = (subtask: Subtask) => {
  subtaskToConvert.value = subtask
  showConvertConfirm.value = true
}

const executeConvert = async () => {
  if (!subtaskToConvert.value) return

  try {
    await todoStore.convertSubtaskToTodo(subtaskToConvert.value.id)
    showConvertConfirm.value = false
    subtaskToConvert.value = null
  } catch (e) {
    console.error('Failed to convert subtask', e)
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
      <div v-for="(parent, index) in incompleteParents" :key="parent.id" class="parent-group" draggable="true"
        @dragstart="handleDragStart($event, index, 'incomplete')" @dragover="handleDragOver"
        @drop="handleDrop(index, 'incomplete')">
        <!-- Parent Row -->
        <div class="subtask-item parent-item">
          <div v-if="getChildren(parent.id).length > 0 || incompleteParents.length > 1" class="drag-handle">
            <GripVertical v-if="incompleteParents.length > 1" :size="14" />
          </div>

          <button @click="toggleSubtask(parent)" class="subtask-checkbox"
            :class="parent.status || (parent.completed ? 'completed' : 'pending')">
            <div v-if="parent.completed" class="check-circle-wrapper">
              <Check :size="14" class="check-icon-inner" />
            </div>
            <div v-else-if="parent.status === 'in-progress'" class="in-progress-circle">
              <div class="inner-dot"></div>
            </div>
            <div v-else class="empty-circle"></div>
          </button>

          <div v-if="editingId === parent.id" class="edit-wrapper">
            <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
              @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
          </div>
          <span v-else class="subtask-text" @click="startEditing(parent)">{{ parent.title }}</span>

          <!-- Actions Group -->
          <div class="actions-group">
            <button class="expand-btn" :class="{ invisible: getChildren(parent.id).length === 0 }"
              @click="toggleExpand(parent.id)">
              <ChevronRight :size="16" class="chevron" :class="{ open: isExpanded(parent.id) }" />
            </button>

            <button v-if="index > 0" class="action-btn indent-btn" @click="handleIndent(parent as Subtask, index)"
              :title="t('modal.indentSubtask')">
              <CornerDownRight :size="14" />
            </button>

            <button class="action-btn add-child-btn" @click="startAddingSubSubtask(parent.id)"
              :title="t('modal.addSubtask')">
              <Plus :size="14" />
            </button>



            <button v-if="!isLocalMode" class="action-btn convert-task-btn" @click="confirmConvert(parent as Subtask)"
              :title="t('modal.convertSubtaskToTask')">
              <ArrowUp :size="14" />
            </button>

            <button v-if="!isLocalMode" class="action-btn move-btn" @click="openMoveModal(parent as Subtask)"
              :title="t('modal.moveSubtask')">
              <ArrowRightLeft :size="14" />
            </button>

            <button @click="deleteSubtask(parent.id)" class="action-btn delete-btn">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>

        <!-- Children Row (Indented) -->
        <div v-if="isExpanded(parent.id)" class="children-container">
          <div v-for="child in getChildren(parent.id)" :key="child.id" class="subtask-item child-item"
            :class="{ completed: child.completed }">
            <div class="indent-line">
              <CornerDownRight :size="14" class="corner-icon" />
            </div>
            <button @click="toggleSubtask(child)" class="subtask-checkbox"
              :class="child.status || (child.completed ? 'completed' : 'pending')">
              <div v-if="child.completed" class="check-circle-wrapper small">
                <Check :size="12" class="check-icon-inner" />
              </div>
              <div v-else-if="child.status === 'in-progress'" class="in-progress-circle small">
                <div class="inner-dot"></div>
              </div>
              <div v-else class="empty-circle small"></div>
            </button>

            <div v-if="editingId === child.id" class="edit-wrapper">
              <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
                @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
            </div>
            <span v-else class="subtask-text" @click="startEditing(child)">{{ child.title }}</span>

            <div class="actions-group">
              <button class="action-btn convert-task-btn" @click="handlePromoteSubtask(child as Subtask)"
                :title="t('modal.promoteSubtask')">
                <ArrowUp :size="14" />
              </button>

              <button v-if="!isLocalMode" class="action-btn move-btn" @click="openMoveModal(child as Subtask)"
                :title="t('modal.moveSubtask')">
                <ArrowRightLeft :size="14" />
              </button>
              <button @click="deleteSubtask(child.id)" class="action-btn delete-btn">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <!-- Input for new child - Always visible for incomplete parents -->
          <div class="subtask-item child-item adding-row">
            <div class="indent-line">
              <CornerDownRight :size="14" class="corner-icon" />
            </div>
            <input class="child-input" :data-parent="parent.id" v-model="newSubSubtaskTitles[parent.id]"
              :placeholder="t('modal.addSubtask')" @keyup.enter="handleAddSubtask(parent.id)"
              @blur="isSubmittingSubtask = false" />
          </div>
        </div>
      </div>
    </div>

    <!-- Add Top Level Subtask Input -->
    <div class="add-subtask">
      <div class="input-wrapper">
        <Plus :size="16" class="plus-icon" />
        <input ref="mainInputRef" v-model="newSubtaskTitle" type="text" :placeholder="t('modal.addSubtask')"
          class="subtask-input" @keyup.enter="handleAddSubtask(null)" />
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
        <div v-for="(parent, index) in completedParents" :key="parent.id" class="parent-group completed-group"
          draggable="true" @dragstart="handleDragStart($event, index, 'completed')" @dragover="handleDragOver"
          @drop="handleDrop(index, 'completed')">
          <div class="subtask-item parent-item completed">
            <div v-if="getChildren(parent.id).length > 0 || completedParents.length > 1" class="drag-handle">
              <GripVertical v-if="completedParents.length > 1" :size="14" />
            </div>

            <button @click="toggleSubtask(parent)" class="subtask-checkbox">
              <div class="check-circle-wrapper">
                <Check :size="14" class="check-icon-inner" />
              </div>
            </button>

            <div v-if="editingId === parent.id" class="edit-wrapper">
              <input ref="editInputRef" v-model="editingTitle" class="edit-input" @blur="saveEditing"
                @keyup.enter="saveEditing" @keyup.escape="cancelEditing" />
            </div>
            <span v-else class="subtask-text" @click="startEditing(parent)">{{ parent.title }}</span>

            <div class="actions-group">
              <button class="expand-btn" :class="{ invisible: getChildren(parent.id).length === 0 }"
                @click="toggleExpand(parent.id)">
                <ChevronRight :size="16" class="chevron" :class="{ open: isExpanded(parent.id) }" />
              </button>

              <button v-if="!isLocalMode" class="action-btn convert-task-btn"
                @click="todoStore.convertSubtaskToTodo(parent.id)" :title="t('modal.convertSubtaskToTask')">
                <ArrowUp :size="14" />
              </button>

              <button v-if="!isLocalMode" class="action-btn move-btn" @click="openMoveModal(parent as Subtask)"
                :title="t('modal.moveSubtask')">
                <ArrowRightLeft :size="14" />
              </button>
              <button @click="deleteSubtask(parent.id)" class="action-btn delete-btn">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <!-- Children of completed parents -->
          <div v-if="isExpanded(parent.id)" class="children-container">
            <div v-for="child in getChildren(parent.id)" :key="child.id" class="subtask-item child-item completed">
              <div class="indent-line"></div>
              <button @click="toggleSubtask(child)" class="subtask-checkbox">
                <div class="check-circle-wrapper small">
                  <Check :size="12" class="check-icon-inner" />
                </div>
              </button>
              <span class="subtask-text">{{ child.title }}</span>
              <div class="actions-group">
                <button v-if="!isLocalMode" class="action-btn convert-task-btn"
                  @click="todoStore.convertSubtaskToTodo(child.id)" :title="t('modal.convertSubtaskToTask')">
                  <ArrowUp :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Move Modal -->
    <MoveSubtaskModal v-if="!isLocalMode && props.todoId" :is-open="isMoveModalOpen" :current-todo-id="props.todoId"
      :subtask-title="subtaskToMove?.title || ''" @close="isMoveModalOpen = false" @move="handleMove" />

    <ConfirmationModal :isOpen="showConvertConfirm" :title="t('modal.convertSubtaskToTask')"
      :message="t('modal.convertSubtaskConfirm')" :confirmText="t('common.convert')" :cancelText="t('common.cancel')"
      type="neutral" @confirm="executeConvert" @cancel="showConvertConfirm = false" />
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
  align-items: flex-start;
  /* Changed from center to flex-start */
  gap: 12px;
  padding: 10px 0;
  transition: all var(--transition-base);
  min-height: 48px;
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
  padding: 4px 0 0 0;
  /* Add top padding to align with text */
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.empty-circle {
  width: 22px;
  height: 22px;
  border: 2px solid currentColor;
  border-radius: 50%;
  transition: all var(--transition-base);
}

.empty-circle.small {
  width: 18px;
  height: 18px;
  border-width: 1.5px;
}

.subtask-checkbox:hover .empty-circle {
  border-color: var(--color-primary);
}

.check-circle-wrapper {
  width: 22px;
  height: 22px;
  background-color: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-circle-wrapper.small {
  width: 18px;
  height: 18px;
}

.check-icon-inner {
  color: white;
}

.subtask-text {
  flex: 1;
  font-size: 1.125rem;
  line-height: 1.4;
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
.actions-group {
  display: flex;
  align-items: center;
  gap: 4px;
  /* Tighter gap for icons */
  margin-top: 2px;
  /* Align with text */
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  opacity: 1;
  transition: all var(--transition-base);
  padding: var(--spacing-xs);
  display: flex;
  align-items: center;
}

.subtask-item:hover .action-btn {
  opacity: 1;
}

/* Removed margin-top: 2px from here since it's on .actions-group now */
/*.action-btn {
  margin-top: 2px;
}*/

.delete-btn:hover {
  color: #EF4444;
}

.add-child-btn:hover {
  color: var(--color-primary);
}

.drag-handle {
  cursor: grab;
  color: var(--color-text-muted);
  padding: 0 4px;
  margin-right: -4px;
  /* Pull next element closer */
  display: flex;
  align-items: center;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.parent-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle:active {
  cursor: grabbing;
}

.move-btn:hover {
  color: var(--color-primary);
}

/* Expand Btn */
.expand-btn {
  background: transparent;
  border: none;
  padding: 0;
  /* Align with top */
  cursor: pointer;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  width: 16px;
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

.in-progress-circle {
  width: 22px;
  height: 22px;
  border: 4px solid var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.in-progress-circle.small {
  width: 18px;
  height: 18px;
  border-width: 3px;
}

.inner-dot {
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
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
  display: flex;
  align-items: center;
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 4px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all var(--transition-base);
}

.input-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1), 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark .input-wrapper {
  background: var(--color-bg-lighter);
}

.plus-icon {
  color: var(--color-text-muted);
  pointer-events: none;
  margin-right: var(--spacing-sm);
}

.subtask-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.subtask-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.7;
}

.subtask-input:focus {
  outline: none;
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


.add-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-bg-lavender);
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
}

.add-btn:hover {
  background: var(--color-primary);
  color: white;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Completed Accordion */
.completed-accordion {
  margin-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
}

.accordion-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.accordion-icon {
  transition: transform 0.2s;
}

.accordion-icon.open {
  transform: rotate(90deg);
}

.accordion-content {
  padding-top: var(--spacing-xs);
}

.completed-group {
  opacity: 0.6;
}
</style>
