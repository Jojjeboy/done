<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import TaskCard from './TaskCard.vue'
import type { TodoItem, Project } from '@/types/todo'
import { Plus } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  status: TodoItem['status']
  tasks: TodoItem[]
  projects: Map<string, Project>
}>()

const emit = defineEmits<{
  (e: 'update:tasks', payload: TodoItem[]): void
  (e: 'add-task', status: TodoItem['status']): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (e: 'change', payload: any): void
}>()

// Writable computed for v-model
const taskList = computed({
  get: () => props.tasks,
  set: (value) => emit('update:tasks', value)
})

const count = computed(() => props.tasks.length)

// Header Color based on status
const headerColor = computed(() => {
  switch (props.status) {
    case 'pending': return 'border-blue-500' // To Do
    case 'in-progress': return 'border-orange-500' // In Progress
    case 'completed': return 'border-green-500' // Done
    default: return 'border-gray-500'
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onChange(event: any) {
  emit('change', event)
}
</script>

<template>
  <div class="kanban-column">
    <div class="column-header" :class="headerColor">
      <div class="header-title-row">
        <h3>{{ title }}</h3>
        <span class="count-badge">{{ count }}</span>
      </div>
      <button class="add-btn" @click="$emit('add-task', status)" title="Add Task">
        <Plus :size="16" />
      </button>
    </div>

    <!--
       Draggable Area
       group="tasks" allows moving between columns
       item-key="id" required for Vue 3
    -->
    <draggable class="task-list" v-model="taskList" group="tasks" item-key="id" :animation="200"
      ghost-class="ghost-card" drag-class="drag-card" @change="onChange">
      <template #item="{ element }">
        <TaskCard :task="element" :project="element.categoryId ? projects.get(element.categoryId) : undefined"
          class="mb-3" />
      </template>
    </draggable>
  </div>
</template>

<style scoped>
.kanban-column {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-width: 250px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  padding: var(--spacing-sm);
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border-light);
}

.dark .column-header {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.kanban-column:nth-child(1) .column-header {
  border-left: 4px solid #6b7280;
}

.kanban-column:nth-child(2) .column-header {
  border-left: 4px solid #f97316;
}

.kanban-column:nth-child(3) .column-header {
  border-left: 4px solid #22c55e;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.column-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.count-badge {
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.add-btn {
  background: transparent;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.add-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-primary);
}

.task-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  /* Space for scrollbar */
  min-height: 100px;
  /* Drop target size */
}

/* Scrollbar styling */
.task-list::-webkit-scrollbar {
  width: 4px;
}

.task-list::-webkit-scrollbar-track {
  background: transparent;
}

.task-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

/* Dragging styles */
.ghost-card {
  opacity: 0.5;
  background: var(--color-bg-tertiary);
  border: 2px dashed var(--color-border);
}

.drag-card {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: var(--shadow-xl);
  z-index: 1000;
}

/* Header colors */
.border-blue-500 {
  border-top-color: #3b82f6;
}

.border-orange-500 {
  border-top-color: #f97316;
}

.border-green-500 {
  border-top-color: #22c55e;
}

.border-gray-500 {
  border-top-color: #6b7280;
}
</style>
