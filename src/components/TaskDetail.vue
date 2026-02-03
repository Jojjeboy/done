<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { parseDateFromText, type DateParseResult } from '@/utils/dateParser'
import type { Subtask } from '@/types/todo'
import { X, Calendar, Flag, Hash, CheckCircle, Circle, Trash2, ArrowLeft, Sparkles, ArrowRightLeft, Pin, ChevronRight, Layers, Star, CircleDashed } from 'lucide-vue-next'
import SubtaskList from '@/components/SubtaskList.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import ConvertTaskModal from '@/components/ConvertTaskModal.vue'

const props = defineProps<{
  id: string
  isEmbedded?: boolean
}>()

const emit = defineEmits(['close', 'deleted'])

const router = useRouter()
const todoStore = useTodoStore()
const authStore = useAuthStore()
const { t } = useI18n()

// State
const taskTitle = ref('')
const taskDescription = ref('')
const taskPriority = ref<'low' | 'medium' | 'high'>('medium')
const taskProject = ref<string>('none')
const taskDeadline = ref<string>('')
const taskStatus = ref<'pending' | 'in-progress' | 'completed'>('pending')
const parsedIntent = ref<DateParseResult | null>(null)
const isSubmitting = ref(false)
const showDeleteConfirm = ref(false)
const deleteCommentId = ref<string | null>(null)
const showConvertModal = ref(false)
const taskIsSticky = ref(false)
const isSubtaskProcessEnabled = ref(false)
const showDiscardConfirm = ref(false)
const isPropertiesOpen = ref(false)
const localSubtasks = ref<Subtask[]>([])

// Change Detection
const initialState = ref('')
const currentTaskState = computed(() => {
  return JSON.stringify({
    title: taskTitle.value,
    description: taskDescription.value,
    priority: taskPriority.value,
    categoryId: taskProject.value,
    status: taskStatus.value,
    isSticky: taskIsSticky.value,
    isSubtaskProcessEnabled: isSubtaskProcessEnabled.value
  })
})

const hasUnsavedChanges = computed(() => {
  if (isNew.value) {
    return taskTitle.value.trim() !== '' || taskDescription.value.trim() !== '' || taskProject.value !== 'none'
  }
  return initialState.value !== currentTaskState.value
})

// Comments State
const newCommentText = ref('')
const isPostingComment = ref(false)

// Derived
const todoId = computed(() => props.id)
const isNew = computed(() => todoId.value === 'new')

const comments = computed(() => {
  return todoStore.commentsByTodoId.get(todoId.value) || []
})

const currentUserAvatar = computed(() => {
  return authStore.user?.photoURL || null
})

const currentUserName = computed(() => {
  return authStore.user?.displayName || t('common.user')
})

// Validation
const isValid = computed(() => taskTitle.value.trim().length > 0)

const loadTodoData = () => {
  if (!isNew.value) {
    const todo = todoStore.todoItems.find(t => t.id === todoId.value)
    if (todo) {
      taskTitle.value = todo.title
      taskDescription.value = todo.description || ''
      taskPriority.value = todo.priority
      taskProject.value = todo.categoryId || 'none'
      taskStatus.value = todo.status
      if (todo.deadline) {
        taskDeadline.value = new Date(todo.deadline as number).toISOString().split('T')[0] as string
      } else {
        taskDeadline.value = ''
      }
      taskIsSticky.value = todo.isSticky || false
      isSubtaskProcessEnabled.value = todo.isSubtaskProcessEnabled || false

      // Capture initial state for change detection
      initialState.value = currentTaskState.value
    }
  } else {
    resetForm()
  }
}

const resetForm = () => {
  taskTitle.value = ''
  taskDescription.value = ''
  taskPriority.value = 'medium'
  taskProject.value = 'none'
  taskDeadline.value = ''
  taskStatus.value = 'pending'
  taskIsSticky.value = false
  isSubtaskProcessEnabled.value = false
  parsedIntent.value = null
  initialState.value = currentTaskState.value
}

const saveChanges = async () => {
  if (!taskTitle.value.trim() || isSubmitting.value) return

  try {
    isSubmitting.value = true

    // Resolve deadline: Priority NLP > Manual
    let deadline = taskDeadline.value ? new Date(taskDeadline.value).getTime() : null
    let finalTitle = taskTitle.value.trim()

    if (parsedIntent.value) {
      finalTitle = parsedIntent.value.text
      deadline = parsedIntent.value.date
    }

    if (isEditMode.value && !isNew.value) {
      await todoStore.updateTodoItem(todoId.value, {
        title: finalTitle,
        description: taskDescription.value.trim(),
        priority: taskPriority.value,
        deadline: deadline,
        categoryId: taskProject.value === 'none' ? null : taskProject.value,
        status: taskStatus.value,
        isSticky: taskIsSticky.value,
        isSubtaskProcessEnabled: isSubtaskProcessEnabled.value
      })

      // If we used NLP, refresh the UI values to match the cleaned state
      if (parsedIntent.value) {
        taskTitle.value = finalTitle
        if (deadline) {
          taskDeadline.value = new Date(deadline).toISOString().split('T')[0] || ''
        }
        parsedIntent.value = null
      }
    } else {
      const newItem = await todoStore.addTodoItem(
        finalTitle,
        taskDescription.value.trim(),
        taskPriority.value,
        deadline,
        taskProject.value === 'none' ? null : taskProject.value,
        null, // Recurrence
        false // isSubtaskProcessEnabled (can be added to addTodoItem later if needed)
      )

      // Persist subtasks for new task
      if (localSubtasks.value.length > 0) {
        const idMap = new Map<string, string>()

        // 1. Filter and add parents first to get their new IDs
        const parents = localSubtasks.value.filter(s => !s.parentId)
        // Sort by order to preserve sequence
        parents.sort((a, b) => (a.order || 0) - (b.order || 0))

        for (const p of parents) {
          try {
            const newSub = await todoStore.addSubtask(newItem.id, p.title)
            idMap.set(p.id, newSub.id)

            // If the local subtask was marked completed, toggle it
            // (addSubtask creates it as pending by default)
            if (p.completed) {
              await todoStore.toggleSubtask(newSub.id)
            }
          } catch (e) {
            console.error('Failed to persist parent subtask', e)
          }
        }

        // 2. Filter and add children using mapped parent IDs
        const children = localSubtasks.value.filter(s => s.parentId)
        // Sort by order
        children.sort((a, b) => (a.order || 0) - (b.order || 0))

        for (const c of children) {
          if (c.parentId) {
            const newParentId = idMap.get(c.parentId)
            if (newParentId) {
              try {
                const newChild = await todoStore.addSubtask(newItem.id, c.title, newParentId)
                if (c.completed) {
                  await todoStore.toggleSubtask(newChild.id)
                }
              } catch (e) {
                console.error('Failed to persist child subtask', e)
              }
            }
          }
        }
      }

      // For embedded mode, we might want to stay here or notify parent
      if (!props.isEmbedded) {
        router.push(`/task/${newItem.id}`)
      }
    }
    // Update initial state after save (moved here to cover both Edit and New)
    initialState.value = currentTaskState.value
  } catch (error) {
    console.error('Failed to save:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleFieldChange = () => {
  if (!isNew.value) {
    saveChanges()
  }
}

const postComment = async () => {
  if (!newCommentText.value.trim() || isNew.value) return

  try {
    isPostingComment.value = true
    await todoStore.addComment(todoId.value, newCommentText.value.trim())
    newCommentText.value = ''
  } catch (error) {
    console.error('Failed to post comment', error)
  } finally {
    isPostingComment.value = false
  }
}

const deleteComment = async (id: string) => {
  deleteCommentId.value = id
}

const confirmDeleteComment = async () => {
  if (deleteCommentId.value) {
    await todoStore.deleteComment(deleteCommentId.value)
    deleteCommentId.value = null
  }
}

const confirmDelete = async () => {
  try {
    if (!isNew.value) {
      await todoStore.deleteTodoItem(todoId.value)
    }
    emit('deleted', todoId.value)

    // Determine where to redirect:
    // If we are in a sub-route (e.g., /board/task/123), go back to the parent (/board)
    // If we are in a dedicated task route (/task/123), go home (/)
    const currentPath = router.currentRoute.value.path
    if (currentPath.includes('/task/')) {
      const parentPath = currentPath.split('/task/')[0] || '/'
      router.push(parentPath)
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error('Failed to delete task:', error)
  } finally {
    showDeleteConfirm.value = false
  }
}

const handleConvertTask = async (targetTodoId: string) => {
  try {
    await todoStore.convertTodoToSubtask(todoId.value, targetTodoId)
    showConvertModal.value = false
    emit('deleted', todoId.value)
    if (!props.isEmbedded) {
      router.replace(`/task/${targetTodoId}`)
    } else {
      emit('close')
    }
  } catch (error) {
    console.error('Failed to convert task:', error)
  }
}

const handleClose = () => {
  // Only show the confirmation modal for brand new tasks that have content
  if (isNew.value && hasUnsavedChanges.value) {
    showDiscardConfirm.value = true
  } else {
    forceClose()
  }
}

const forceClose = () => {
  emit('close')
  // Determine where to redirect:
  // If we are in a sub-route (e.g., /board/task/123), go back to the parent (/board)
  // If we are in a dedicated task route (/task/123), go home (/)
  const currentPath = router.currentRoute.value.path
  if (currentPath.includes('/task/')) {
    const parentPath = currentPath.split('/task/')[0] || '/'
    router.push(parentPath)
  } else {
    router.push('/')
  }
}

// Watchers
watch(() => props.id, loadTodoData)

watch(taskTitle, (newVal) => {
  if (!newVal) {
    parsedIntent.value = null
    return
  }

  const result = parseDateFromText(newVal)
  if (result && result.date) {
    parsedIntent.value = result
  } else {
    parsedIntent.value = null
  }
})

// Initialize
onMounted(async () => {
  if (!todoStore.initialized) {
    await todoStore.initialize()
  }
  loadTodoData()
})

const isEditMode = computed(() => !isNew.value)

const metaItems = computed(() => {
  const items = []

  // Category
  if (taskProject.value && taskProject.value !== 'none') {
    const project = todoStore.projects.find(p => p.id === taskProject.value)
    if (project) items.push({ icon: Hash, text: project.title, color: project.color })
  }

  // Priority
  if (taskPriority.value) {
    const priorityLabel = t(`tasks.priority.${taskPriority.value}`)
    items.push({ icon: Flag, text: priorityLabel })
  }

  // Process
  if (isSubtaskProcessEnabled.value) {
    items.push({ icon: Layers, text: t('tasks.threeStep') })
  }

  // Sticky
  if (taskIsSticky.value) {
    items.push({ icon: Pin, text: t('tasks.sticky') })
  }

  // Date
  if (taskDeadline.value) {
    items.push({ icon: Calendar, text: taskDeadline.value })
  }

  return items
})
</script>

<template>
  <div class="task-detail-comp" :class="{ 'is-embedded': isEmbedded }">
    <!-- Header -->
    <div class="modal-header">
      <div class="header-left">
        <div class="breadcrumbs clickable mobile-only" @click="handleClose">
          <ArrowLeft v-if="!isEmbedded" :size="18" class="back-arrow" />
          <span class="crumb-text">{{ t('common.back') }}</span>
        </div>
      </div>

      <div class="header-controls">
        <button v-if="!isNew" class="icon-btn convert-btn" :title="t('modal.convertTask')"
          @click="showConvertModal = true">
          <ArrowRightLeft :size="18" />
        </button>
        <button v-if="!isNew" class="icon-btn delete-btn" :title="t('common.delete')" @click="showDeleteConfirm = true">
          <Trash2 :size="18" />
        </button>
        <button class="icon-btn close-btn" :title="t('common.close')" @click="handleClose">
          <X :size="18" />
        </button>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="modal-content">
      <!-- Title Section -->
      <div class="title-section">
        <div class="status-segmented-control">
          <div class="status-selection-bg" :class="taskStatus"></div>
          <button @click="taskStatus = 'pending'; handleFieldChange()" :class="{ active: taskStatus === 'pending' }"
            class="status-btn" :title="t('tasks.status.pending')">
            <Circle :size="18" />
          </button>
          <div class="status-connector" :class="{ active: taskStatus !== 'pending' }"></div>
          <button @click="taskStatus = 'in-progress'; handleFieldChange()"
            :class="{ active: taskStatus === 'in-progress' }" class="status-btn" :title="t('tasks.status.in-progress')">
            <CircleDashed :size="18" />
          </button>
          <div class="status-connector" :class="{ active: taskStatus === 'completed' }"></div>
          <button @click="taskStatus = 'completed'; handleFieldChange()" :class="{ active: taskStatus === 'completed' }"
            class="status-btn" :title="t('tasks.status.completed')">
            <CheckCircle :size="18" />
          </button>
        </div>
        <div class="title-details">
          <div v-if="taskStatus === 'completed'" class="completed-badge">
            <CheckCircle :size="12" />
            <span>{{ t('tasks.status.completed') }}</span>
          </div>
          <input v-model="taskTitle" type="text" class="task-title-input"
            :class="{ completed: taskStatus === 'completed' }" :placeholder="t('modal.whatTask')"
            @blur="handleFieldChange" @keydown.enter="handleFieldChange">
          <div v-if="parsedIntent" class="intent-badge" @click="saveChanges">
            <Sparkles :size="12" />
            <span>{{ t('tasks.due') }}: {{ new Date(parsedIntent.date!).toLocaleString() }}</span>
          </div>
          <textarea v-model="taskDescription" class="task-desc-textarea"
            :placeholder="t('modal.descriptionPlaceholder')" @blur="handleFieldChange" rows="1"></textarea>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Properties Accordion -->
      <div class="properties-section">
        <button class="accordion-header" @click="isPropertiesOpen = !isPropertiesOpen">
          <div class="accordion-title-wrapper" v-if="metaItems.length > 0">
            <template v-for="(item, index) in metaItems" :key="index">
              <div class="meta-pill">
                <div v-if="item.color" class="project-dot" :style="{ backgroundColor: item.color }"></div>
                <component v-else :is="item.icon" :size="12" />
                <span>{{ item.text }}</span>
              </div>
              <span v-if="index < metaItems.length - 1" class="meta-divider">·</span>
            </template>
          </div>
          <span v-else class="accordion-title">{{ t('modal.details') }}</span>

          <ChevronRight :size="16" class="chevron" :class="{ open: isPropertiesOpen }" />
        </button>

        <div v-show="isPropertiesOpen" class="properties-content">
          <!-- Properties Grid (Organized Grid) -->
          <div class="properties-grid">
            <!-- Project -->
            <div class="property-item" :title="t('modal.project')">
              <div class="prop-icon">
                <div v-if="taskProject !== 'none'" class="project-dot"
                  :style="{ backgroundColor: todoStore.projectsById.get(taskProject)?.color || '#ccc' }"></div>
                <Hash v-else :size="14" />
              </div>
              <select v-model="taskProject" @change="handleFieldChange" class="clean-select">
                <option value="none">{{ t('tasks.categories.none') }}</option>
                <option v-for="project in todoStore.projects" :key="project.id" :value="project.id">
                  {{ project.title }}
                </option>
              </select>
            </div>

            <!-- Date -->
            <div class="property-item" :title="t('modal.dueDate')">
              <div class="prop-icon">
                <Calendar :size="14" />
              </div>
              <input type="date" v-model="taskDeadline" @change="handleFieldChange" class="clean-date-input">
            </div>

            <!-- Priority -->
            <div class="property-item" :title="t('modal.priority')">
              <div class="prop-icon">
                <Flag :size="14" />
              </div>
              <select v-model="taskPriority" @change="handleFieldChange" class="clean-select">
                <option value="low">{{ t('tasks.priority.low') }}</option>
                <option value="medium">{{ t('tasks.priority.medium') }}</option>
                <option value="high">{{ t('tasks.priority.high') }}</option>
              </select>
            </div>

            <!-- Sticky Toggle (Button) -->
            <button class="sticky-toggle-btn" :class="{ active: taskIsSticky }"
              @click="taskIsSticky = !taskIsSticky; handleFieldChange()" :title="t('tasks.sticky')">
              <Pin :size="14" :class="{ filled: taskIsSticky }" />
              <span>{{ t('tasks.sticky') }}</span>
            </button>

            <!-- Favorite Toggle (Button) -->
            <button class="favorite-toggle-btn" :class="{ active: taskPriority === 'high' }"
              @click="taskPriority = (taskPriority === 'high' ? 'medium' : 'high'); handleFieldChange()"
              :title="t('tasks.filters.starred')">
              <Star :size="14" :class="{ filled: taskPriority === 'high' }" />
              <span>{{ t('tasks.filters.starred') }}</span>
            </button>

            <!-- Subtask Process Toggle (Segmented Control) -->
            <div class="segmented-control">
              <div class="selection-bg" :class="{ 'pos-right': isSubtaskProcessEnabled }"></div>
              <button @click="isSubtaskProcessEnabled = false; handleFieldChange()"
                :class="{ active: !isSubtaskProcessEnabled }">
                {{ t('tasks.twoStep') }}
              </button>
              <button @click="isSubtaskProcessEnabled = true; handleFieldChange()"
                :class="{ active: isSubtaskProcessEnabled }">
                {{ t('tasks.threeStep') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Subtasks -->
      <div class="subtasks-container">
        <div class="subtasks-container">
          <SubtaskList :todo-id="isNew ? undefined : todoId" :process-enabled="isSubtaskProcessEnabled"
            v-model="localSubtasks" />
        </div>
      </div>

      <div class="divider" v-if="!isNew"></div>

      <!-- Comments -->
      <div class="comments-section" v-if="!isNew">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-avatar">
            <img v-if="authStore.user?.photoURL && comment.userId === authStore.user.uid" :src="authStore.user.photoURL"
              alt="User">
            <div v-else class="avatar-placeholder">{{ comment.userId.charAt(0).toUpperCase() }}</div>
          </div>
          <div class="comment-bubble">
            <div class="comment-meta">
              <span class="comment-author">{{ comment.userId === authStore.user?.uid ? currentUserName :
                t('common.user')
              }}</span>
              <span class="comment-time">{{ new Date(comment.createdAt).toLocaleString() }}</span>
              <button class="delete-comment-btn" @click="deleteComment(comment.id)"
                v-if="comment.userId === authStore.user?.uid">
                <X :size="12" />
              </button>
            </div>
            <div class="comment-text">{{ comment.text }}</div>
          </div>
        </div>

        <!-- New Comment Input -->
        <div class="new-comment-row">
          <div class="comment-avatar">
            <img v-if="currentUserAvatar" :src="currentUserAvatar" alt="User">
            <div v-else class="avatar-placeholder">{{ currentUserName.charAt(0) }}</div>
          </div>
          <div class="comment-input-wrapper">
            <input v-model="newCommentText" type="text" :placeholder="t('tasks.writeComment')" class="comment-input"
              @keydown.enter="postComment" ref="commentInputRef">
            <button class="attach-btn" :disabled="!newCommentText.trim()" @click="postComment">
              <span class="send-icon">➤</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="isNew" class="create-actions">
        <button class="btn-primary" @click="saveChanges" :disabled="!isValid">{{ t('modal.createTask')
        }}</button>
      </div>
    </div>

    <!-- Modals -->
    <ConfirmationModal :isOpen="showDeleteConfirm" :title="t('common.deleteTask')" :message="t('common.deleteConfirm')"
      :confirmText="t('common.delete')" :cancelText="t('common.cancel')" type="danger" @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false" />

    <ConfirmationModal :isOpen="showDiscardConfirm" :title="t('common.areYouSure')"
      :message="t('common.discardChanges')" :confirmText="t('common.discard')" :cancelText="t('common.cancel')"
      type="danger" @confirm="forceClose" @cancel="showDiscardConfirm = false" />


    <ConfirmationModal :isOpen="!!deleteCommentId" :title="t('common.deleteComment')"
      :message="t('common.deleteCommentConfirm')" :confirmText="t('common.delete')" :cancelText="t('common.cancel')"
      type="danger" @confirm="confirmDeleteComment" @cancel="deleteCommentId = null" />

    <ConvertTaskModal :isOpen="showConvertModal" :todoId="todoId" :todoTitle="taskTitle"
      @close="showConvertModal = false" @convert="handleConvertTask" />
  </div>
</template>

<style scoped>
.task-detail-comp {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-white);
}

.dark .task-detail-comp {
  background: var(--color-bg-card);
}

.is-embedded {
  border-radius: 0;
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  height: 50px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumbs.clickable {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: background 0.2s;
  color: var(--color-text-secondary);
}

@media (min-width: 768px) {
  .breadcrumbs.clickable.mobile-only {
    display: none;
  }
}

.breadcrumbs.clickable:hover {
  background: var(--color-bg-lighter);
  color: var(--color-text-primary);
}

.back-arrow {
  margin-right: -4px;
}

.header-separator {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 0 4px;
}

.crumb-text {
  font-size: 0.85rem;
  font-weight: 500;
}

.crumb-select {
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  font-size: 0.9rem;
}

.header-controls {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--color-bg-lighter);
  color: var(--color-text-primary);
}

.delete-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* Scrollable Content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
}

@media (min-width: 768px) {
  .modal-content {
    padding: 24px 40px;
  }
}

/* Title Section */
.title-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: flex-start;
  /* Top align */
}

/* Status Segmented Control */
.status-segmented-control {
  display: flex;
  background: var(--color-bg-lighter);
  border-radius: 20px;
  padding: 2px;
  gap: 2px;
  position: relative;
  width: 100px;
  height: 32px;
  align-items: stretch;
  flex-shrink: 0;
  margin-top: 4px;
}

.status-selection-bg {
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(33.33% - 2.66px);
  bottom: 2px;
  background: #9ca3af;
  border-radius: 18px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 0;
}

.status-selection-bg.pending {
  transform: translateX(0);
  background: #9ca3af;
}

.status-selection-bg.in-progress {
  transform: translateX(calc(100% + 2px));
  background: #ff8a50;
}

.status-selection-bg.completed {
  transform: translateX(calc(200% + 4px));
  background: #4ade80;
}

.status-btn {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  z-index: 1;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.status-btn.active {
  color: white;
}

.status-connector {
  flex: 1;
  height: 2px;
  background: var(--color-bg-tertiary);
  transition: background 0.3s;
  z-index: 1;
  max-width: 12px;
}

.status-connector.active {
  background: var(--color-primary);
}

.status-btn.active .inner-dot {
  background: white;
  border-color: white;
}

.title-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-title-input {
  font-size: 1.5rem;
  font-weight: 600;
  border: none;
  background: transparent;
  width: 100%;
  color: var(--color-text-primary);
  padding: 0;
  transition: color 0.2s;
}

.task-title-input.completed {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.task-title-input:focus {
  outline: none;
}

.completed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-status-completed-light, #ecfdf5);
  color: var(--color-status-completed, #10b981);
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
  width: fit-content;
}

.dark .completed-badge {
  background: rgba(16, 185, 129, 0.15);
}

.task-desc-textarea {
  font-size: 1rem;
  color: var(--color-text-secondary);
  border: none;
  background: transparent;
  width: 100%;
  padding: 0;
  resize: none;
  font-family: inherit;
  line-height: 1.4;
}

.task-desc-textarea:focus {
  outline: none;
}

.divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 16px 0;
}

/* Properties Section */
.properties-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* Move chevron to right? Or left? Usually left or right. */
  gap: 8px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  font-weight: 600;
  width: 100%;
}

.accordion-title {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.accordion-header .chevron {
  transition: transform 0.2s;
  color: var(--color-text-muted);
}

.accordion-header:hover .accordion-title {
  color: var(--color-text-primary);
}

.accordion-title-wrapper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--color-bg-lighter);
  padding: 2px 8px;
  border-radius: 12px;
  /* Pill shape */
  border: 1px solid transparent;
}

.dark .meta-pill {
  background: rgba(255, 255, 255, 0.05);
}

.accordion-header .chevron.open {
  transform: rotate(90deg);
}

.properties-content {
  margin-top: 8px;
}

/* Properties Grid (Restored Grid) */
.properties-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.property-item {
  display: flex;
  align-items: center;
  background: var(--color-bg-lighter);
  padding: 6px 14px;
  border-radius: var(--radius-md);
  gap: 10px;
  min-height: 36px;
  box-sizing: border-box;
  color: var(--color-text-primary);
}

.prop-icon {
  display: flex;
  align-items: center;
  color: var(--color-text-muted);
  opacity: 1;
}

.clean-select,
.clean-date-input {
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  width: 100%;
}

.clean-select:hover,
.clean-date-input:hover {
  color: var(--color-text-primary);
}

.clean-select:focus,
.clean-date-input:focus {
  outline: none;
}

.sticky-toggle-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg-lighter);
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  transition: all 0.2s;
  min-height: 36px;
  box-sizing: border-box;
  width: 100%;
}

.sticky-toggle-btn.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 500;
}

.sticky-toggle-btn:hover {
  filter: brightness(0.95);
  color: var(--color-text-muted);
}

.project-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.favorite-toggle-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg-lighter);
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius-md);
  transition: all 0.2s;
  min-height: 36px;
  box-sizing: border-box;
  width: 100%;
}

.favorite-toggle-btn.active {
  background: #fef3c7;
  color: #d97706;
}

.dark .favorite-toggle-btn.active {
  background: rgba(217, 119, 6, 0.2);
  color: #fbbf24;
}

.favorite-toggle-btn .filled {
  fill: currentColor;
}

.favorite-toggle-btn:hover {
  filter: brightness(0.95);
}

/* Segmented Control */
.segmented-control {
  display: flex;
  background: var(--color-bg-lighter);
  border-radius: var(--radius-md);
  padding: 4px;
  gap: 4px;
  position: relative;
  min-height: 36px;
  align-items: stretch;
  box-sizing: border-box;
  margin-left: 0;
}

.selection-bg {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 6px);
  bottom: 4px;
  background: var(--color-primary);
  border-radius: calc(var(--radius-md) - 2px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 0;
}

.dark .selection-bg {
  background: var(--color-primary);
  /* Revert dark mode override if needed, or keep consistent */
}

.selection-bg.pos-right {
  transform: translateX(calc(100% + 4px));
}

.segmented-control button {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  z-index: 1;
  transition: color 0.2s;
  padding: 4px 8px;
  border-radius: calc(var(--radius-md) - 2px);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: auto;
}

.segmented-control button.active {
  color: white;
  font-weight: 500;
}


/* Subtasks */
.subtasks-container {
  margin-top: 8px;
}

.subtasks-container :deep(.subtask-title) {
  font-size: 0.95rem;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

/* Comments */
.comments-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-avatar,
.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  color: #555;
  flex-shrink: 0;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.comment-bubble {
  flex: 1;
  background: var(--color-bg-lighter);
  padding: 8px 12px;
  border-radius: 8px;
}

.comment-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.comment-author {
  font-weight: 600;
  color: var(--color-text-primary);
}

.delete-comment-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 0;
}

.delete-comment-btn:hover {
  color: #ef4444;
}

.new-comment-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
}

.comment-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 6px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark .comment-input-wrapper {
  background: var(--color-bg-lighter);
}

.comment-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  padding: 4px 0;
}

.comment-input:focus {
  outline: none;
}

.attach-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: 4px;
  display: flex;
  align-items: center;
}

.attach-btn:hover {
  color: var(--color-primary);
}

.create-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.intent-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-primary);
  margin-top: 2px;
  font-weight: 500;
  animation: fadeIn 0.2s ease;
  cursor: pointer;
}

.intent-badge:hover {
  text-decoration: underline;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
