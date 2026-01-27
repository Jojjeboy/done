<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { X, Calendar, Edit2, Clock, Sparkles, Repeat, CalendarPlus, Trash2 } from 'lucide-vue-next'
import SubtaskList from '@/components/SubtaskList.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import { parseDateFromText, type DateParseResult } from '@/utils/dateParser'


const props = defineProps<{
  todoId?: string | null
  initialCategoryId?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const todoStore = useTodoStore()
const { t } = useI18n()

const taskTitle = ref('')
const taskDescription = ref('')
const taskPriority = ref<'low' | 'medium' | 'high'>('medium')
const taskCategory = ref<string>('none')
const taskDeadline = ref<string>('')
const taskRecurrence = ref<'daily' | 'weekly' | 'monthly' | 'none'>('none')
const parsedIntent = ref<DateParseResult | null>(null)
const isSubmitting = ref(false)

const isEditMode = ref(false)
const viewMode = ref(false)
const showDeleteConfirm = ref(false)

const loadTodoData = () => {
  if (props.todoId) {
    const todo = todoStore.todoItems.find(t => t.id === props.todoId)
    if (todo) {
      taskTitle.value = todo.title
      taskDescription.value = todo.description || ''
      taskPriority.value = todo.priority
      taskCategory.value = todo.categoryId || 'none'
      if (todo.deadline) {
        taskDeadline.value = new Date(todo.deadline as number).toISOString().split('T')[0] as string
      } else {
        taskDeadline.value = ''
      }
      taskRecurrence.value = todo.recurrence || 'none'
      viewMode.value = true
      isEditMode.value = true // Tracks if we are "editing existing" vs "creating new" for save logic
    }
  } else {
    resetForm()
    viewMode.value = false
    isEditMode.value = false
  }
}

const toggleViewMode = () => {
  viewMode.value = !viewMode.value
}

const localSubtasks = ref<{ title: string; completed: boolean; id: string }[]>([])

const resetForm = () => {
  taskTitle.value = ''
  taskDescription.value = ''
  taskPriority.value = 'medium'
  taskCategory.value = props.initialCategoryId || 'none'
  taskDeadline.value = ''
  taskRecurrence.value = 'none'
  parsedIntent.value = null
  localSubtasks.value = []
}

onMounted(() => {
  loadTodoData()
})

watch(() => props.todoId, () => {
  loadTodoData()
})

watch(taskTitle, (newVal) => {
  if (viewMode.value) return
  if (!newVal) {
    parsedIntent.value = null
    return
  }

  const result = parseDateFromText(newVal)
  // Only suggest if  date found matches something useful and is not just the original text
  if (result && result.date) {
    parsedIntent.value = result
  } else {
    parsedIntent.value = null
  }
})

const handleClose = () => {
  emit('close')
}

const handleSave = async () => {
  if (!taskTitle.value.trim()) return

  try {
    isSubmitting.value = true
    const deadline = taskDeadline.value ? new Date(taskDeadline.value).getTime() : null

    if (isEditMode.value && props.todoId) {
      await todoStore.updateTodoItem(props.todoId, {
        title: parsedIntent.value ? parsedIntent.value.text : taskTitle.value.trim(),
        description: taskDescription.value.trim(),
        priority: taskPriority.value,
        deadline: parsedIntent.value && parsedIntent.value.date ? parsedIntent.value.date : deadline,
        categoryId: taskCategory.value === 'none' ? null : taskCategory.value,
        recurrence: taskRecurrence.value === 'none' ? null : taskRecurrence.value
      })
    } else {
      const newItem = await todoStore.addTodoItem(
        parsedIntent.value ? parsedIntent.value.text : taskTitle.value.trim(),
        taskDescription.value.trim(),
        taskPriority.value,
        parsedIntent.value && parsedIntent.value.date ? parsedIntent.value.date : deadline,
        taskCategory.value === 'none' ? null : taskCategory.value,
        taskRecurrence.value === 'none' ? null : taskRecurrence.value
      )

      // Add Subtasks
      if (localSubtasks.value.length > 0) {
        for (const sub of localSubtasks.value) {
          await todoStore.addSubtask(newItem.id, sub.title)
        }
      }
    }
    handleClose()
  } catch (error) {
    console.error('Failed to save task:', error)
  } finally {
    isSubmitting.value = false
  }
}

const googleCalendarLink = computed(() => {
  if (!taskDeadline.value) return '#'

  const title = encodeURIComponent(taskTitle.value)
  const details = encodeURIComponent(taskDescription.value || '')

  // Format dates: YYYYMMDD
  // Since we only have date (no time in taskDeadline string), we create an all-day event
  const dateStr = taskDeadline.value.replace(/-/g, '')
  const dates = `${dateStr}/${dateStr}`

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`
})


const handleDelete = () => {
  if (!props.todoId) return
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  try {
    isSubmitting.value = true
    await todoStore.deleteTodoItem(props.todoId!)
    handleClose()
  } catch (error) {
    console.error('Failed to delete task:', error)
  } finally {
    isSubmitting.value = false
    showDeleteConfirm.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-left">
          <h2 class="modal-title" v-if="!viewMode">{{ isEditMode ? t('modal.editTask') : t('modal.newTask') }}</h2>
          <div v-else class="view-header">
            <span class="category-badge" v-if="taskCategory !== 'none'"
              :style="{ backgroundColor: todoStore.categoriesById.get(taskCategory)?.color + '20', color: todoStore.categoriesById.get(taskCategory)?.color }">
              {{ todoStore.categoriesById.get(taskCategory)?.title }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <a v-if="viewMode && taskDeadline" :href="googleCalendarLink" target="_blank" class="action-btn"
            :title="t('common.addToGoogleCalendar')">
            <CalendarPlus :size="18" />
          </a>
          <button v-if="viewMode" @click="handleDelete" class="action-btn delete-btn" :title="t('common.delete')">
            <Trash2 :size="18" />
          </button>
          <button v-if="viewMode" @click="toggleViewMode" class="action-btn" :title="t('common.edit')">
            <Edit2 :size="18" />
          </button>
          <button @click="handleClose" class="close-btn">
            <X :size="20" />
          </button>
        </div>
      </div>

      <div class="modal-body">
        <!-- View Mode -->
        <div v-if="viewMode" class="view-container">
          <h1 class="view-title">{{ taskTitle }}</h1>

          <div class="view-meta">
            <div class="meta-item" v-if="taskDeadline">
              <Clock :size="16" />
              <span>{{ new Date(taskDeadline).toLocaleDateString() }}</span>
            </div>
            <div class="meta-item priority-badge" :class="taskPriority">
              {{ t(`tasks.priority.${taskPriority}`) }}
            </div>
            <div class="meta-item" v-if="taskRecurrence !== 'none'">
              <Repeat :size="16" />
              <span class="capitalize">{{ t(`tasks.recurrence.${taskRecurrence}`) }}</span>
            </div>
          </div>

          <p class="view-description" v-if="taskDescription">{{ taskDescription }}</p>
          <p class="view-description empty" v-else>{{ t('modal.noDescription') }}</p>

          <SubtaskList v-if="props.todoId" :todo-id="props.todoId" />
        </div>

        <!-- Edit/Create Mode -->
        <div v-else class="step-container">
          <div class="form-group">
            <label class="label">{{ t('modal.whatTask') }}</label>
            <input v-model="taskTitle" type="text" :placeholder="t('modal.taskPlaceholder')" class="form-input"
              autofocus />
            <div v-if="parsedIntent" class="intent-badge">
              <Sparkles :size="12" />
              <span>{{ t('tasks.due') }}: {{ new Date(parsedIntent.date!).toLocaleDateString() }}</span>
            </div>
          </div>

          <div class="form-group mt-xl">
            <label class="label">{{ t('modal.description') }}</label>
            <textarea v-model="taskDescription" :placeholder="t('modal.descriptionPlaceholder')"
              class="form-textarea"></textarea>
          </div>

          <div class="form-row mt-xl">
            <div class="form-group flex-1">
              <label class="label">{{ t('modal.priority') }}</label>
              <select v-model="taskPriority" class="form-select">
                <option value="low">{{ t('tasks.priority.low') }}</option>
                <option value="medium">{{ t('tasks.priority.medium') }}</option>
                <option value="high">{{ t('tasks.priority.high') }}</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label class="label">{{ t('modal.category') }}</label>
              <select v-model="taskCategory" class="form-select">
                <option value="none">{{ t('modal.categories.none') }}</option>
                <option v-for="category in todoStore.categories" :key="category.id" :value="category.id">
                  {{ category.title }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-group mt-xl">
            <label class="label">{{ t('modal.dueDate') }}</label>
            <div class="date-input-wrapper">
              <Calendar :size="18" class="date-icon" />
              <input v-model="taskDeadline" type="date" class="form-input date-input" />
            </div>
          </div>

          <div class="form-group mt-xl">
            <label class="label">{{ t('modal.repeat') }}</label>
            <div class="recurrence-options">
              <button type="button" v-for="option in ['none', 'daily', 'weekly', 'monthly']" :key="option"
                class="recurrence-btn" :class="{ active: taskRecurrence === option }"
                @click="taskRecurrence = option as any">
                {{ option === 'none' ? t('tasks.recurrence.none') : t(`tasks.recurrence.${option}`) }}
              </button>
            </div>
          </div>

          <SubtaskList :todo-id="props.todoId" v-model="localSubtasks" />

          <div class="footer-actions mt-2xl">
            <button v-if="viewMode" class="btn-secondary flex-1" @click="toggleViewMode">
              {{ t('common.edit') }}
            </button>
            <template v-else>
              <button v-if="isEditMode" class="btn-secondary" @click="toggleViewMode">
                {{ t('common.cancel') }}
              </button>
              <button class="btn-primary flex-1" :disabled="!taskTitle.trim() || isSubmitting" @click="handleSave">
                {{ isSubmitting ? t('modal.saving') : (isEditMode ? t('modal.saveTask') : t('modal.createTask')) }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <ConfirmationModal :isOpen="showDeleteConfirm" :title="t('common.deleteTask')" :message="t('common.deleteConfirm')"
      :confirmText="t('common.delete')" :cancelText="t('common.cancel')" type="danger" @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false" />
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn var(--transition-base);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.modal-content {
  background: var(--color-bg-white);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  max-width: 480px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .modal-content {
  background-color: var(--color-bg-card);
}

@keyframes slideIn {
  from {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }

  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-2xl) var(--spacing-2xl) var(--spacing-lg);
  position: sticky;
  top: 0;
  background: inherit;
  z-index: 10;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  padding: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  border-radius: var(--radius-md);
}

.action-btn:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.delete-btn:hover {
  background: #FEE2E2;
  color: #EF4444;
}

/* View Mode Styles */
.view-container {
  padding-bottom: var(--spacing-2xl);
}

.view-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
  line-height: 1.3;
}

.view-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.category-badge {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
}

.priority-badge {
  text-transform: capitalize;
  font-weight: var(--font-weight-medium);
  padding: 2px 8px;
  border-radius: 4px;
}

.priority-badge.high {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.priority-badge.medium {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.1);
}

.priority-badge.low {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.view-description {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: var(--spacing-2xl);
}

.view-description.empty {
  color: var(--color-text-muted);
  font-style: italic;
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0;
}

.close-btn {
  background: var(--color-bg-lavender);
  border: none;
  cursor: pointer;
  color: var(--color-primary);
  padding: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  border-radius: var(--radius-md);
}

.close-btn:hover {
  background-color: var(--color-primary);
  color: white;
}

.modal-body {
  padding: 0 var(--spacing-2xl) var(--spacing-2xl);
}

.label {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-sm);
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-bg-lighter);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  background: var(--color-bg-white);
}

.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-icon {
  position: absolute;
  left: var(--spacing-lg);
  color: var(--color-text-muted);
  pointer-events: none;
}

.date-input {
  padding-left: calc(var(--spacing-lg) * 2 + 18px) !important;
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  transition: all var(--transition-base);
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-purple);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: var(--spacing-lg) var(--spacing-xl);
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-secondary:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.footer-actions {
  display: flex;
  gap: var(--spacing-md);
}

.mt-xl {
  margin-top: var(--spacing-xl);
}

.mt-2xl {
  margin-top: var(--spacing-2xl);
}

.flex-1 {
  flex: 1;
}

.recurrence-options {
  display: flex;
  gap: var(--spacing-sm);
  background: var(--color-bg-lighter);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.recurrence-btn {
  flex: 1;
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  transition: all 0.2s;
  text-transform: capitalize;
}

.recurrence-btn.active {
  background: var(--color-bg-white);
  color: var(--color-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-weight: 500;
}

.intent-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-primary);
  margin-top: 4px;
  font-weight: 500;
  animation: fadeIn 0.2s ease;
}
</style>
