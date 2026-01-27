<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import {
  X, Calendar, Flag, MapPin,
  Hash, CheckCircle, Circle, Trash2, ArrowLeft
} from 'lucide-vue-next'
import SubtaskList from '@/components/SubtaskList.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import { type DateParseResult } from '@/utils/dateParser'

const route = useRoute()
const router = useRouter()
const todoStore = useTodoStore()
const authStore = useAuthStore()
const { t } = useI18n()

// State
const taskTitle = ref('')
const taskDescription = ref('')
const taskPriority = ref<'low' | 'medium' | 'high'>('medium')
const taskCategory = ref<string>('none')
const taskDeadline = ref<string>('')
const taskStatus = ref<'pending' | 'in-progress' | 'completed'>('pending')
const taskLocation = ref<{ lat: number; lng: number } | null>(null)
const parsedIntent = ref<DateParseResult | null>(null)
const isSubmitting = ref(false)
const showDeleteConfirm = ref(false)
const showLocationUpdateConfirm = ref(false)
const showAlertModal = ref(false)
const alertMessage = ref('')
const deleteCommentId = ref<string | null>(null)

// Comments State
const newCommentText = ref('')
const isPostingComment = ref(false)

// Derived
const todoId = computed(() => route.params.id as string)
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
      taskCategory.value = todo.categoryId || 'none'
      taskStatus.value = todo.status
      taskLocation.value = todo.location || null
      if (todo.deadline) {
        taskDeadline.value = new Date(todo.deadline as number).toISOString().split('T')[0] as string
      } else {
        taskDeadline.value = ''
      }
    }
  } else {
    resetForm()
    if (route.query.category) {
      taskCategory.value = route.query.category as string
    }
  }
}

const resetForm = () => {
  taskTitle.value = ''
  taskDescription.value = ''
  taskPriority.value = 'medium'
  taskCategory.value = 'none'
  taskDeadline.value = ''
  taskStatus.value = 'pending'
  taskLocation.value = null
  parsedIntent.value = null
}

const saveChanges = async () => {
  if (!taskTitle.value.trim() || isSubmitting.value) return

  try {
    isSubmitting.value = true
    const deadline = taskDeadline.value ? new Date(taskDeadline.value).getTime() : null

    if (isEditMode.value && !isNew.value) {
      await todoStore.updateTodoItem(todoId.value, {
        title: taskTitle.value.trim(),
        description: taskDescription.value.trim(),
        priority: taskPriority.value,
        deadline: deadline,
        categoryId: taskCategory.value === 'none' ? null : taskCategory.value,
        status: taskStatus.value,
        location: taskLocation.value
      })
    } else {
      const newItem = await todoStore.addTodoItem(
        taskTitle.value.trim(),
        taskDescription.value.trim(),
        taskPriority.value,
        deadline,
        taskCategory.value === 'none' ? null : taskCategory.value,
        null, // Recurrence
        taskLocation.value
      )
      // Replace route to editing mode without reload
      router.replace(`/task/${newItem.id}`)
    }
  } catch (error) {
    console.error('Failed to save:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Autosave on blur or changes (debounced could be better but sticking to simple blur/change for now)
const handleFieldChange = () => {
  if (!isNew.value) {
    saveChanges()
  }
}

const toggleCompletion = () => {
  taskStatus.value = taskStatus.value === 'completed' ? 'pending' : 'completed'
  handleFieldChange()
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
    router.back()
  } catch (error) {
    console.error('Failed to delete task:', error)
  } finally {
    showDeleteConfirm.value = false
  }
}

const handleLocationClick = () => {
  if (taskLocation.value) {
    showLocationUpdateConfirm.value = true
  } else {
    fetchLocation()
  }
}

const fetchLocation = () => {
  if (!navigator.geolocation) {
    alertMessage.value = 'Geolocation is not supported by your browser'
    showAlertModal.value = true
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      taskLocation.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      handleFieldChange()
      showLocationUpdateConfirm.value = false // Close if it was open
    },
    (error) => {
      console.error('Error fetching location:', error)
      let message = 'Unable to retrieve your location'
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied. Please enable it in browser settings.'
          break
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable.'
          break
        case error.TIMEOUT:
          message = 'The request to get user location timed out.'
          break
      }
      alertMessage.value = message
      showAlertModal.value = true
      showLocationUpdateConfirm.value = false
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  )
}

// Watchers
watch(() => route.params.id, loadTodoData)

// Initialize
onMounted(async () => {
  if (!todoStore.initialized) {
    await todoStore.initialize()
  }
  loadTodoData()
})

const isEditMode = computed(() => !isNew.value)

</script>

<template>
  <div class="detail-container">
    <!-- Close Overlay -->
    <div class="overlay" @click="router.back()"></div>

    <div class="card-modal">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <button class="icon-btn" :title="t('common.back')" @click="router.back()">
            <ArrowLeft :size="18" />
          </button>
          <div class="breadcrumbs">
            <span class="crumb-text">{{ t('tasks.title') }}</span>
            <span class="crumb-separator">/</span>
            <div class="crumb-category">
              <select v-model="taskCategory" @change="handleFieldChange" class="crumb-select">
                <option value="none">{{ t('tasks.categories.none') }}</option>
                <option v-for="cat in todoStore.categories" :key="cat.id" :value="cat.id">
                  {{ cat.title }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="header-controls">
          <button class="icon-btn delete-btn" :title="t('common.delete')" @click="showDeleteConfirm = true">
            <Trash2 :size="18" />
          </button>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="modal-content">
        <!-- Title Section -->
        <div class="title-section">
          <button class="status-checkbox" @click="toggleCompletion" :class="{ completed: taskStatus === 'completed' }">
            <CheckCircle v-if="taskStatus === 'completed'" :size="24" class="check-icon" />
            <Circle v-else :size="24" class="circle-icon" />
          </button>
          <div class="title-inputs">
            <input v-model="taskTitle" type="text" class="task-title-input" :placeholder="t('modal.whatTask')"
              @blur="handleFieldChange" @keydown.enter="handleFieldChange">
            <input v-model="taskDescription" type="text" class="task-desc-input"
              :placeholder="t('modal.descriptionPlaceholder')" @blur="handleFieldChange">
          </div>
        </div>

        <div class="divider"></div>

        <!-- Properties Grid -->
        <div class="properties-list">
          <!-- Category -->
          <div class="property-row">
            <div class="prop-icon">
              <Hash :size="16" />
            </div>
            <div class="prop-content">
              <select v-model="taskCategory" @change="handleFieldChange" class="clean-select">
                <option value="none">{{ t('tasks.categories.none') }}</option>
                <option v-for="cat in todoStore.categories" :key="cat.id" :value="cat.id">
                  {{ cat.title }}
                </option>
              </select>
            </div>
          </div>

          <!-- Date -->
          <div class="property-row">
            <div class="prop-icon">
              <Calendar :size="16" />
            </div>
            <div class="prop-content">
              <input type="date" v-model="taskDeadline" @change="handleFieldChange" class="clean-date-input">
            </div>
          </div>

          <!-- Priority -->
          <div class="property-row">
            <div class="prop-icon">
              <Flag :size="16" />
            </div>
            <div class="prop-content">
              <select v-model="taskPriority" @change="handleFieldChange" class="clean-select">
                <option value="low">{{ t('tasks.priority.low') }}</option>
                <option value="medium">{{ t('tasks.priority.medium') }}</option>
                <option value="high">{{ t('tasks.priority.high') }}</option>
              </select>
            </div>
          </div>

          <!-- Location (Modified) -->
          <div class="property-row location-row">
            <div class="prop-icon">
              <MapPin :size="16" />
            </div>
            <div class="prop-content location-content" @click="handleLocationClick">
              <span v-if="!taskLocation" class="placeholder">{{ t('tasks.addLocation') }}</span>
              <span v-else class="location-coords">{{ taskLocation.lat.toFixed(4) }}, {{ taskLocation.lng.toFixed(4)
                }}</span>
            </div>
          </div>

          <!-- Map Preview -->
          <div v-if="taskLocation" class="map-preview">
            <iframe width="100%" height="200" style="border:0; border-radius: 8px;" loading="lazy" allowfullscreen
              :src="`https://maps.google.com/maps?q=${taskLocation.lat},${taskLocation.lng}&z=15&output=embed`">
            </iframe>
          </div>

        </div>

        <div class="divider"></div>

        <!-- Subtasks -->
        <div class="subtasks-container">
          <SubtaskList :todo-id="isNew ? undefined : todoId" />
        </div>

        <div class="divider"></div>

        <!-- Comments -->
        <div class="comments-section" v-if="!isNew">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-avatar">
              <img v-if="authStore.user?.photoURL && comment.userId === authStore.user.uid"
                :src="authStore.user.photoURL" alt="User">
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
                @keydown.enter="postComment">
              <button class="attach-btn" :disabled="!newCommentText.trim()" @click="postComment">
                <span class="send-icon">➤</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="isNew" class="create-actions">
          <button class="btn-primary" @click="saveChanges" :disabled="!isValid">{{ t('modal.createTask') }}</button>
        </div>

      </div>
    </div>

    <ConfirmationModal :isOpen="showDeleteConfirm" :title="t('common.deleteTask')" :message="t('common.deleteConfirm')"
      :confirmText="t('common.delete')" :cancelText="t('common.cancel')" type="danger" @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false" />

    <!-- Alert Modal -->
    <ConfirmationModal :isOpen="showAlertModal" :title="t('common.notice')" :message="alertMessage"
      :confirmText="t('common.close')" singleButton @confirm="showAlertModal = false"
      @cancel="showAlertModal = false" />

    <!-- Location Update Confirm -->
    <ConfirmationModal :isOpen="showLocationUpdateConfirm" :title="t('common.updateLocation')"
      :message="t('common.updateLocationMessage')" :confirmText="t('common.update')" :cancelText="t('common.cancel')"
      @confirm="fetchLocation" @cancel="showLocationUpdateConfirm = false" />

    <!-- Delete Comment Confirm -->
    <ConfirmationModal :isOpen="!!deleteCommentId" :title="t('common.deleteComment')"
      :message="t('common.deleteCommentConfirm')" :confirmText="t('common.delete')" :cancelText="t('common.cancel')"
      type="danger" @confirm="confirmDeleteComment" @cancel="deleteCommentId = null" />
  </div>
</template>

<style scoped>
.detail-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  justify-content: center;
  background-color: transparent;
}

/* Overlay background */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: -1;
}

/* Card Modal */
.card-modal {
  background: var(--color-bg-white);
  width: 100%;
  max-width: 700px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-2xl);
  animation: slideUp 0.2s ease-out;
}

@media (min-width: 768px) {
  .card-modal {
    height: auto;
    max-height: 90vh;
    margin-top: 5vh;
    border-radius: 8px;
  }
}

.dark .card-modal {
  background: var(--color-bg-card);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  height: 50px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.crumb-select {
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-weight: 500;
  cursor: pointer;
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
  padding: 24px 40px;
}

/* Title Section */
.title-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.status-checkbox {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 0 0 0;
  color: var(--color-text-muted);
}

.status-checkbox.completed {
  color: var(--color-status-completed);
}

.title-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-title-input {
  font-size: 1.5rem;
  font-weight: 700;
  border: none;
  background: transparent;
  width: 100%;
  color: var(--color-text-primary);
  padding: 0;
}

.task-title-input:focus {
  outline: none;
}

.task-desc-input {
  font-size: 1rem;
  color: var(--color-text-secondary);
  border: none;
  background: transparent;
  width: 100%;
  padding: 0;
}

.task-desc-input:focus {
  outline: none;
}

.divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 16px 0;
}

/* Properties Grid */
.properties-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.property-row {
  display: flex;
  align-items: center;
  min-height: 32px;
}

.prop-icon {
  width: 32px;
  display: flex;
  align-items: center;
  color: var(--color-text-muted);
}

.prop-content {
  flex: 1;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
}

.prop-content.placeholder {
  color: var(--color-text-muted);
  cursor: pointer;
  font-style: italic;
}

.prop-content.location-content {
  cursor: pointer;
}

.prop-content.location-content:hover {
  color: var(--color-primary);
}

.clean-select,
.clean-date-input {
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0;
  width: 100%;
}

.clean-select:focus,
.clean-date-input:focus {
  outline: none;
}

.map-preview {
  margin-top: 8px;
  margin-left: 32px;
  /* Align with content */
}

/* Subtasks */
.subtasks-container {
  margin-top: 16px;
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
</style>
