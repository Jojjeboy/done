<script setup lang="ts">
import { ref } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

const emit = defineEmits<{
  close: []
}>()

const todoStore = useTodoStore()
const { t } = useI18n()

const taskTitle = ref('')
const taskDescription = ref('')
const taskPriority = ref<'low' | 'medium' | 'high'>('medium')
const taskCategory = ref<string>('none')
const isSubmitting = ref(false)

const handleClose = () => {
  emit('close')
}

const handleAddTask = async () => {
  if (!taskTitle.value.trim()) return

  try {
    isSubmitting.value = true

    await todoStore.addTodoItem(
      taskTitle.value.trim(),
      taskDescription.value.trim(),
      taskPriority.value,
      null,
      taskCategory.value === 'none' ? null : taskCategory.value
    )
    handleClose()
  } catch (error) {
    console.error('Failed to add task:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ t('modal.newTask') }}</h2>
        <button @click="handleClose" class="close-btn">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div class="step-container">
          <div class="form-group">
            <label class="label">{{ t('modal.whatTask') }}</label>
            <input
              v-model="taskTitle"
              type="text"
              :placeholder="t('modal.taskPlaceholder')"
              class="form-input"
              autofocus
            />
          </div>

          <div class="form-group mt-xl">
            <label class="label">{{ t('modal.description') }}</label>
            <textarea
              v-model="taskDescription"
              :placeholder="t('modal.descriptionPlaceholder')"
              class="form-textarea"
            ></textarea>
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
                <option
                  v-for="category in todoStore.categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.title }}
                </option>
              </select>
            </div>
          </div>

          <div class="footer-actions mt-2xl">
            <button
              class="btn-primary flex-1"
              :disabled="!taskTitle.trim() || isSubmitting"
              @click="handleAddTask"
            >
              {{ isSubmitting ? t('modal.creating') : t('modal.createTask') }}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  from { opacity: 0; }
  to { opacity: 1; }
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
  from { transform: translateY(20px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
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

.project-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.project-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-base);
  width: 100%;
  text-align: left;
}

.project-item:hover {
  background: var(--color-bg-lavender);
  border-color: var(--color-primary-light);
}

.project-item.active {
  background: var(--color-bg-purple-tint);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.project-color {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
}

.project-name {
  flex: 1;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.check-icon {
  color: var(--color-primary);
}

.list-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.list-item {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-base);
}

.list-item:hover {
  border-color: var(--color-primary-light);
  color: var(--color-primary);
}

.list-item.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.form-input, .form-textarea, .form-select {
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

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  background: var(--color-bg-white);
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

.mt-xl { margin-top: var(--spacing-xl); }
.mt-2xl { margin-top: var(--spacing-2xl); }
.flex-1 { flex: 1; }
</style>
