<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
} from 'lucide-vue-next'
import type { TodoItem, Project } from '@/types/todo'
import { useTodoStore } from '@/stores/todo'

const props = defineProps<{
  task: TodoItem
  project?: Project
}>()

const router = useRouter()
const todoStore = useTodoStore()

// Priority Colors
const priorityColor = computed(() => {
  switch (props.task.priority) {
    case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
})

const priorityLabel = computed(() => {
  return props.task.priority.charAt(0).toUpperCase() + props.task.priority.slice(1)
})

// Subtask Progress
const subtasks = computed(() => todoStore.subtasksByTodoId.get(props.task.id) || [])
const progress = computed(() => {
  if (subtasks.value.length === 0) return null
  const completed = subtasks.value.filter(s => s.completed).length
  return {
    total: subtasks.value.length,
    completed,
    percentage: Math.round((completed / subtasks.value.length) * 100)
  }
})

// Due Date Formatting
const formattedDate = computed(() => {
  if (!props.task.deadline) return null
  const date = new Date(props.task.deadline)
  return new Intl.DateTimeFormat('default', { month: 'short', day: 'numeric' }).format(date)
})

const isOverdue = computed(() => {
  if (!props.task.deadline) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return props.task.deadline < today.getTime() && props.task.status !== 'completed'
})

const navigateToDetail = () => {
    // Check if we are in a project-specific board view
    const currentProjectId = router.currentRoute.value.params.projectId

    if (router.currentRoute.value.path.startsWith('/board')) {
       if (currentProjectId) {
           router.push({
               name: 'board-project-task-detail',
               params: { projectId: currentProjectId, id: props.task.id }
           })
       } else {
           router.push({
               name: 'board-task-detail',
               params: { id: props.task.id }
           })
       }
    } else {
        // Fallback to home view (list view) navigation
        router.push({ name: 'home', params: { id: props.task.id } })
    }
}
</script>

<template>
  <div
    class="task-card"
    @click="navigateToDetail"
  >
    <div class="card-header">
      <span class="priority-badge" :class="priorityColor">
        {{ priorityLabel }}
      </span>
      <span v-if="project" class="project-dot" :style="{ backgroundColor: project.color || '#ccc' }" :title="project.title"></span>
    </div>

    <h4 class="task-title" :class="{ 'completed': task.status === 'completed' }">
      {{ task.title }}
    </h4>

    <div v-if="progress" class="progress-section">
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: `${progress.percentage}%` }"></div>
      </div>
      <span class="progress-text">{{ progress.completed }}/{{ progress.total }}</span>
    </div>

    <div class="card-footer">
      <div v-if="formattedDate" class="due-date" :class="{ 'overdue': isOverdue }">
        <Calendar :size="14" />
        <span>{{ formattedDate }}</span>
      </div>
      <div v-else class="spacer"></div>

      <!-- Placeholder for assignee or other icons -->
    </div>
  </div>
</template>

<style scoped>
.task-card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border);
  user-select: none; /* Important for dragging */
}

.task-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--color-primary-light);
}

.dark .task-card {
  background: var(--color-bg-secondary); /* Slightly lighter than pure dark bg */
  border-color: var(--color-border);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xs);
}

.priority-badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.project-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.task-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-title.completed {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.progress-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.progress-bar-bg {
  flex: 1;
  height: 4px;
  background: var(--color-bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.due-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

.due-date.overdue {
  color: var(--color-error);
  font-weight: 500;
}
</style>
