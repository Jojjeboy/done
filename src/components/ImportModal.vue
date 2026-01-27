<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, AlertTriangle, Check, ChevronRight } from 'lucide-vue-next'
import { useTodoStore } from '@/stores/todo'

const props = defineProps<{
  isOpen: boolean
  categoryId?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'import'): void
}>()

const { t } = useI18n()
const todoStore = useTodoStore()

const showExample = ref(false)

const importText = ref('')
const isAnalyzing = ref(false)
const importError = ref<string | null>(null)
interface ImportSubtask {
  title: string
  subtasks?: string[]
}

interface ImportTask {
  title: string
  description?: string
  priority?: string
  deadline?: string
  subtasks?: (string | ImportSubtask)[]
}

const parsedTasks = ref<ImportTask[]>([])

const exampleJson = `[
  {
    "title": "Buy groceries",
    "priority": "high",
    "deadline": "2026-01-30",
    "subtasks": [
      "Milk",
      {
        "title": "Vegetables",
        "subtasks": ["Carrots", "Spinach"]
      }
    ]
  },
  {
    "title": "Call dentist",
    "priority": "medium"
  }
]`

const isValidJson = computed(() => {
  if (!importText.value.trim()) return false
  try {
    JSON.parse(importText.value)
    return true
  } catch {
    return false
  }
})

const analyzeImport = () => {
  importError.value = null
  parsedTasks.value = []
  isAnalyzing.value = true

  try {
    const data = JSON.parse(importText.value)
    if (!Array.isArray(data)) {
      throw new Error('Root element must be an array')
    }

    // Basic validation
    const validTasks = (data as unknown[]).filter((item): item is ImportTask =>
      typeof item === 'object' &&
      item !== null &&
      'title' in item &&
      typeof (item as Record<string, unknown>).title === 'string'
    )

    if (validTasks.length === 0) {
      throw new Error('No valid tasks found in JSON')
    }

    parsedTasks.value = validTasks as ImportTask[]
  } catch (e) {
    importError.value = e instanceof Error ? e.message : 'Invalid JSON format'
  } finally {
    isAnalyzing.value = false
  }
}

const performImport = async () => {
  if (parsedTasks.value.length === 0) return

  try {
    for (const task of parsedTasks.value) {
      let deadline = null
      if (task.deadline) {
        deadline = new Date(task.deadline).getTime()
        if (isNaN(deadline)) deadline = null
      }

      let priority: 'low' | 'medium' | 'high' = 'medium'
      if (task.priority && ['low', 'medium', 'high'].includes(task.priority.toLowerCase())) {
        priority = task.priority.toLowerCase() as 'low' | 'medium' | 'high'
      }

      const newTodo = await todoStore.addTodoItem(
        task.title,
        task.description || '',
        priority,
        deadline,
        props.categoryId || null
      )

      if (task.subtasks && Array.isArray(task.subtasks)) {
        for (const subItem of task.subtasks) {
          if (typeof subItem === 'string') {
             // Simple subtask
            await todoStore.addSubtask(newTodo.id, subItem)
          } else if (typeof subItem === 'object' && subItem.title) {
             // Parent subtask
             const parent = await todoStore.addSubtask(newTodo.id, subItem.title)
             if (subItem.subtasks && Array.isArray(subItem.subtasks)) {
                 for (const childTitle of subItem.subtasks) {
                     if (typeof childTitle === 'string') {
                         await todoStore.addSubtask(newTodo.id, childTitle, parent.id)
                     }
                 }
             }
          }
        }
      }
    }
    emit('import')
    closeModal()
  } catch (e) {
    console.error('Import failed', e)
    importError.value = t('import.failedToImport')
  }
}

const closeModal = () => {
  importText.value = ''
  parsedTasks.value = []
  importError.value = null
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ t('common.importTasks') }}</h3>
        <button class="close-btn" @click="closeModal">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <div v-if="parsedTasks.length === 0" class="input-section">
          <p class="instruction">
            {{ t('import.instructions') }}
          </p>

          <div class="example-accordion" :class="{ open: showExample }">
            <button class="accordion-toggle" @click="showExample = !showExample">
              <span>{{ t('import.viewExample') }}</span>
              <ChevronRight :size="16" class="toggle-icon" />
            </button>
            <div v-if="showExample" class="accordion-content">
              <pre class="example-json">{{ exampleJson }}</pre>
            </div>
          </div>

          <div class="textarea-wrapper">
            <textarea v-model="importText" :placeholder="t('import.jsonPlaceholder')" class="json-input"
              spellcheck="false"></textarea>
            <div class="format-badge">JSON</div>
          </div>

          <div v-if="importError" class="error-message">
            <AlertTriangle :size="16" />
            <span>{{ importError }}</span>
          </div>
        </div>

        <div v-else class="preview-section">
          <div class="preview-header">
            <h4>{{ t('import.readyToImport', { count: parsedTasks.length }) }}</h4>
            <button class="text-btn" @click="parsedTasks = []">{{ t('import.editJson') }}</button>
          </div>

          <div class="preview-list">
            <div v-for="(task, idx) in parsedTasks" :key="idx" class="preview-item">
              <div class="preview-main">
                <span class="preview-title">{{ task.title }}</span>
                <span class="preview-meta">
                  <span v-if="task.priority" class="tag" :class="task.priority">{{ task.priority
                  }}</span>
                  <span v-if="task.subtasks?.length" class="tag subtasks">{{ task.subtasks.length }}
                    subtasks</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="closeModal">{{ t('common.cancel') }}</button>
        <button v-if="parsedTasks.length === 0" class="btn-primary" @click="analyzeImport" :disabled="!isValidJson">
          {{ t('import.analyze') }}
        </button>
        <button v-else class="btn-primary" @click="performImport">
          <span class="btn-content">
            <Check :size="16" />
            {{ t('import.importTasksCount', { count: parsedTasks.length }) }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.dark .modal-content {
  background: var(--color-bg-card);
}

.modal-header {
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-light);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
}

.modal-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
  flex: 1;
}

.instruction {
  margin-bottom: var(--spacing-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: inherit;
}

.example-accordion {
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-white);
}

.dark .example-accordion {
  background: var(--color-bg-card);
}

.accordion-toggle {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-lighter);
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  transition: all 0.2s;
}

.accordion-toggle:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.toggle-icon {
  transition: transform 0.2s;
}

.open .toggle-icon {
  transform: rotate(90deg);
}

.accordion-content {
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border-light);
  max-height: 200px;
  overflow-y: auto;
}

.example-json {
  margin: 0;
  font-family: monospace;
  font-size: 0.85em;
  color: var(--color-text-muted);
  white-space: pre-wrap;
  word-break: break-all;
}

.text-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.text-btn:hover {
  color: var(--color-primary);
}

.textarea-wrapper {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.json-input {
  width: 100%;
  height: 300px;
  padding: var(--spacing-md);
  border: none;
  resize: none;
  background: var(--color-bg-lighter);
  color: var(--color-text-primary);
  font-family: monospace;
  font-size: 0.9em;
}

.json-input:focus {
  outline: none;
  background: var(--color-bg-white);
}

.format-badge {
  position: absolute;
  bottom: var(--spacing-sm);
  right: var(--spacing-sm);
  background: var(--color-bg-lavender);
  color: var(--color-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7em;
  font-weight: bold;
}

.error-message {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  max-height: 400px;
  overflow-y: auto;
}

.preview-item {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-lighter);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.preview-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title {
  font-weight: 500;
}

.preview-meta {
  display: flex;
  gap: var(--spacing-xs);
}

.tag {
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: bold;
}

.tag.high {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.tag.medium {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.tag.low {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.tag.subtasks {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-text-secondary);
}

.btn-primary {
  background: var(--color-primary);
  border: none;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: white;
  font-weight: 600;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
</style>
