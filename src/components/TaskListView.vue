<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'
import { Check, Clock, Star } from 'lucide-vue-next'
import type { TodoItem } from '@/types/todo'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const route = useRoute()

type FilterType = 'all' | 'todo' | 'in-progress' | 'completed' | 'starred'
const activeFilter = ref<FilterType>('all')

const activeCategoryId = computed(() => route.query.category as string | undefined)

// Get all tasks from all lists, filtered by category if active
const allTasks = computed(() => {
  let tasks = todoStore.todoItems

  if (activeCategoryId.value) {
    tasks = tasks.filter(t => t.categoryId === activeCategoryId.value)
  }

  return tasks
})

// Filter tasks based on active filter
const filteredTasks = computed(() => {
  if (activeFilter.value === 'all') return allTasks.value
  if (activeFilter.value === 'todo') return allTasks.value.filter(t => t.status === 'pending')
  if (activeFilter.value === 'in-progress') return allTasks.value.filter(t => t.status === 'in-progress')
  if (activeFilter.value === 'completed') return allTasks.value.filter(t => t.status === 'completed')
  if (activeFilter.value === 'starred') return allTasks.value.filter(t => t.priority === 'high')
  return allTasks.value
})

// Group tasks by date
const tasksByDate = computed(() => {
  const groups = new Map<string, TodoItem[]>()

  filteredTasks.value.forEach((task) => {
    let dateKey: string

    if (!task.deadline) {
      dateKey = 'no-date'
    } else {
      const taskDate = new Date(task.deadline)
      taskDate.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (taskDate.toDateString() === today.toDateString()) {
        dateKey = 'today'
      } else if (taskDate.toDateString() === tomorrow.toDateString()) {
        dateKey = 'tomorrow'
      } else {
        const isoString = taskDate.toISOString().split('T')[0]
        dateKey = isoString || taskDate.toISOString()
      }
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(task)
  })

  // Sort groups by date
  const sortedGroups = new Map<string, { label: string; tasks: TodoItem[] }>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Add today first
  const todayTasks = groups.get('today')
  if (todayTasks) {
    sortedGroups.set('today', { label: `Today ${today.toLocaleDateString('en-US', { weekday: 'long' })}`, tasks: todayTasks })
  }

  // Add tomorrow
  const tomorrowTasks = groups.get('tomorrow')
  if (tomorrowTasks) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    sortedGroups.set('tomorrow', { label: `Tomorrow ${tomorrow.toLocaleDateString('en-US', { weekday: 'long' })}`, tasks: tomorrowTasks })
  }

  // Add other dates
  const otherDates = Array.from(groups.entries())
    .filter(([key]) => key !== 'today' && key !== 'tomorrow' && key !== 'no-date')
    .sort(([a], [b]) => a.localeCompare(b))

  otherDates.forEach(([key, tasks]) => {
    const date = new Date(key)
    sortedGroups.set(key, {
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'long' }),
      tasks,
    })
  })

  // Add no-date at the end
  const noDateTasks = groups.get('no-date')
  if (noDateTasks) {
    sortedGroups.set('no-date', { label: 'No date', tasks: noDateTasks })
  }

  return sortedGroups
})

const toggleTask = async (task: TodoItem) => {
  let newStatus: TodoItem['status']

  if (settingsStore.isThreeStepEnabled) {
    if (task.status === 'pending') newStatus = 'in-progress'
    else if (task.status === 'in-progress') newStatus = 'completed'
    else newStatus = 'pending'
  } else {
    newStatus = task.status === 'completed' ? 'pending' : 'completed'
  }

  try {
    await todoStore.updateTodoItem(task.id, { status: newStatus })
  } catch (error) {
    console.error('Failed to toggle task:', error)
  }
}

const togglePriority = async (task: TodoItem) => {
  const newPriority = task.priority === 'high' ? 'medium' : 'high'
  try {
    await todoStore.updateTodoItem(task.id, { priority: newPriority })
  } catch (error) {
    console.error('Failed to toggle priority:', error)
  }
}



const formatTime = (deadline: number | null) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

onMounted(async () => {
  if (!todoStore.initialized) {
    try {
      await todoStore.initialize()
    } catch (error) {
      console.error('Failed to initialize todo store:', error)
    }
  }
})
</script>

<template>
  <div class="task-list-view">
    <div class="filter-tabs">
      <button
        class="filter-tab"
        :class="{ active: activeFilter === 'all' }"
        @click="activeFilter = 'all'"
      >
        {{ t('tasks.filters.all') }}
      </button>
      <button
        class="filter-tab"
        :class="{ active: activeFilter === 'todo' }"
        @click="activeFilter = 'todo'"
      >
        {{ t('tasks.filters.todo') }}
      </button>
      <button
        class="filter-tab"
        :class="{ active: activeFilter === 'in-progress' }"
        @click="activeFilter = 'in-progress'"
      >
        {{ t('tasks.filters.inProgress') }}
      </button>
      <button
        class="filter-tab"
        :class="{ active: activeFilter === 'completed' }"
        @click="activeFilter = 'completed'"
      >
        {{ t('tasks.filters.completed') }}
      </button>
      <button
        class="filter-tab"
        :class="{ active: activeFilter === 'starred' }"
        @click="activeFilter = 'starred'"
      >
        {{ t('tasks.filters.starred') }}
      </button>
    </div>

    <TransitionGroup
      name="list"
      tag="div"
      class="task-sections"
    >
      <div
        v-for="[dateKey, group] in tasksByDate"
        :key="dateKey"
        class="task-section"
      >
        <h3 class="section-title">{{ group.label }}</h3>
        <TransitionGroup
          name="list"
          tag="div"
          class="tasks"
        >
          <div
            v-for="task in group.tasks"
            :key="task.id"
            class="task-card"
            :class="{ completed: task.status === 'completed' }"
          >
            <button
              @click="toggleTask(task)"
              class="task-checkbox-btn"
              :title="task.status === 'pending' ? 'Start task' : task.status === 'in-progress' ? 'Complete task' : 'Restart task'"
              :aria-label="task.status === 'pending' ? 'Start task' : task.status === 'in-progress' ? 'Complete task' : 'Restart task'"
            >
              <div v-if="task.status === 'completed'" class="check-circle-wrapper">
                <Check :size="14" class="check-icon-inner" />
              </div>
              <div v-else-if="task.status === 'in-progress'" class="progress-circle-wrapper">
                <div class="inner-dot"></div>
              </div>
              <div v-else class="empty-circle"></div>
            </button>

            <div class="task-content">
              <div class="task-main-info">
                <h4 class="task-title">{{ task.title }}</h4>
                <div class="task-meta">
                  <span v-if="task.categoryId" class="task-category-dot" :style="{ backgroundColor: todoStore.categoriesById.get(task.categoryId)?.color }"></span>
                  <div class="task-time" v-if="task.deadline">
                    <Clock :size="12" />
                    <span>{{ formatTime(task.deadline) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              class="task-star-btn"
              @click.stop="togglePriority(task)"
              :class="{ active: task.priority === 'high' }"
            >
              <Star :size="20" :class="{ 'star-filled': task.priority === 'high' }" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </TransitionGroup>

    <div v-if="filteredTasks.length === 0" class="empty-state">
      <p>No tasks to show</p>
    </div>
  </div>
</template>

<style scoped>
.task-list-view {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 5rem;
}

.filter-tabs {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-tabs::-webkit-scrollbar {
  display: none;
}

.filter-tab {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;
}

.filter-tab:hover {
  background: var(--color-bg-lavender);
}

.filter-tab.active {
  background: var(--color-primary);
  color: var(--color-text-white);
  box-shadow: var(--shadow-purple);
}

.task-sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
  padding: 0 0 var(--spacing-lg);
}

.task-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: capitalize;
  padding: 0;
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.task-card {
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md) var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  transition: all var(--transition-base);
  border: 1px solid var(--color-border-light);
}

.task-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.dark .task-card {
  background: var(--color-bg-card);
}

.task-card.completed .task-title {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.task-checkbox-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.empty-circle {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-text-muted);
  border-radius: 50%;
  transition: all var(--transition-base);
}

.empty-circle:hover {
  border-color: var(--color-primary);
}

.check-circle-wrapper {
  width: 20px;
  height: 20px;
  background-color: var(--color-status-todo);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon-inner {
  color: white;
}

.progress-circle-wrapper {
  width: 20px;
  height: 20px;
  border: 4px solid var(--color-status-progress);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.inner-dot {
  width: 6px;
  height: 6px;
  background-color: var(--color-status-progress);
  border-radius: 50%;
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-main-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.task-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  line-height: var(--line-height-normal);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.task-category-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.task-time {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.task-star-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: var(--spacing-xs);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.task-star-btn:hover {
  color: var(--color-primary);
}

.task-star-btn.active {
  color: var(--color-primary);
}

.star-filled {
  fill: currentColor;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-4xl) var(--spacing-lg);
  color: var(--color-text-muted);
}

.dark .empty-state {
  color: var(--color-text-secondary);
}
</style>
