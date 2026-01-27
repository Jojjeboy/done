<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { Check, Clock, Star, List, ChevronRight, Search, X } from 'lucide-vue-next'
import type { TodoItem } from '@/types/todo'
import FilterModal from '@/components/FilterModal.vue'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()



type FilterType = 'all' | 'todo' | 'in-progress' | 'completed' | 'starred'
const activeFilter = ref<FilterType>((route.query.filter as FilterType) || 'all')

import { watch } from 'vue'
watch(() => route.query.filter, (newFilter) => {
  if (newFilter) {
    activeFilter.value = newFilter as FilterType
  } else {
    activeFilter.value = 'all'
  }
})

const activeCategoryId = computed(() => route.query.category as string | undefined)

const showFilterModal = ref(false)

const resetFilters = () => {
  activeFilter.value = 'all'
  router.replace({ query: {} })
}

const currentViewLabel = computed(() => {
  if (activeCategoryId.value) {
    if (activeCategoryId.value === '__none__') {
      return t('tasks.categories.none')
    }
    return todoStore.categoriesById.get(activeCategoryId.value)?.title || t('modal.category')
  }
  return t(`tasks.filters.${activeFilter.value}`)
})

// Get all tasks from all lists, filtered by category if active
const allTasks = computed(() => {
  let tasks = todoStore.todoItems

  if (activeCategoryId.value) {
    if (activeCategoryId.value === '__none__') {
      tasks = tasks.filter(t => t.categoryId === null)
    } else {
      tasks = tasks.filter(t => t.categoryId === activeCategoryId.value)
    }
  }

  return tasks
})

const completedTasks = computed(() => {
  if (activeFilter.value === 'all') {
    return allTasks.value.filter(t => t.status === 'completed')
  }
  return []
})

const isCompletedOpen = ref(false)

// Filter tasks based on active filter AND search
const filteredTasks = computed(() => {
  let tasks = allTasks.value

  // Search Filter (from Store)
  if (todoStore.searchQuery && todoStore.searchQuery.trim()) {
    const query = todoStore.searchQuery.toLowerCase()
    tasks = tasks.filter(t => t.title.toLowerCase().includes(query))
  }

  if (activeFilter.value === 'all') {
    // In 'all' view, we show pending/in-progress here, completed go to accordion
    return tasks.filter(t => t.status !== 'completed')
  }
  if (activeFilter.value === 'todo') return tasks.filter(t => t.status === 'pending')
  if (activeFilter.value === 'in-progress') return tasks.filter(t => t.status === 'in-progress')
  if (activeFilter.value === 'completed') return tasks.filter(t => t.status === 'completed')
  if (activeFilter.value === 'starred') return tasks.filter(t => t.priority === 'high')
  return tasks
})

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
    sortedGroups.set('today', { label: `${t('tasks.today')} ${today.toLocaleDateString(undefined, { weekday: 'long' })}`, tasks: todayTasks })
  }

  // Add tomorrow
  const tomorrowTasks = groups.get('tomorrow')
  if (tomorrowTasks) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    sortedGroups.set('tomorrow', { label: `${t('tasks.tomorrow')} ${tomorrow.toLocaleDateString(undefined, { weekday: 'long' })}`, tasks: tomorrowTasks })
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
    sortedGroups.set('no-date', { label: t('tasks.noDate'), tasks: noDateTasks })
  }

  return sortedGroups
})

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
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)

  let datePrefix = ''
  if (taskDate.getTime() === today.getTime()) {
    datePrefix = ''
  } else if (taskDate.getTime() === tomorrow.getTime()) {
    datePrefix = t('tasks.tomorrow') + ' '
  } else {
    datePrefix = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return datePrefix
}

const handleTaskClick = (task: TodoItem) => {
  if (settingsStore.inSelectionMode) {
    settingsStore.toggleTaskInFocusMode(task.id)
  } else {
    router.push(`/task/${task.id}`)
  }
}

const handleTaskAction = (task: TodoItem) => {
  if (settingsStore.inSelectionMode) {
    settingsStore.toggleTaskInFocusMode(task.id)
  } else {
    todoStore.toggleTodoCompletion(task.id)
  }
}

const enterFocusMode = () => {
  router.push('/focus')
  settingsStore.inSelectionMode = false
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
    <div class="task-header">
      <div class="view-group">
        <div class="view-selector" @click="showFilterModal = true">
          <h2 class="view-title">{{ currentViewLabel }}</h2>
          <ChevronRight :size="20" class="rotate-90" />
        </div>
        <button v-if="activeFilter !== 'all' || activeCategoryId" class="reset-btn" @click="resetFilters"
          :title="t('tasks.clearFilters')">
          <X :size="14" />
        </button>
      </div>

      <div class="search-container">
        <Search :size="18" class="search-icon" />
        <input v-model="todoStore.searchQuery" type="text" class="search-input"
          :placeholder="t('search.placeholder')" />
        <button v-if="todoStore.searchQuery" class="search-clear-btn" @click="todoStore.searchQuery = ''"
          :title="t('search.clear')">
          <X :size="14" />
        </button>
      </div>
    </div>

    <TransitionGroup name="list" tag="div" class="task-sections">
      <div v-for="[dateKey, group] in tasksByDate" :key="dateKey" class="task-section">
        <h3 class="section-title">{{ group.label }}</h3>
        <TransitionGroup name="list" tag="div" class="tasks">
          <div v-for="task in group.tasks" :key="task.id" class="task-card" :class="{
            completed: task.status === 'completed',
            selected: settingsStore.focusModeTaskIds.includes(task.id)
          }" @click="handleTaskClick(task)">
            <button @click.stop="handleTaskAction(task)" class="task-checkbox-btn"
              :class="{ 'selection-mode': settingsStore.inSelectionMode }"
              :title="settingsStore.inSelectionMode ? (settingsStore.focusModeTaskIds.includes(task.id) ? t('modal.deselect') : t('modal.select')) : (task.status === 'pending' ? t('modal.startTask') : task.status === 'in-progress' ? t('modal.completeTask') : t('modal.restartTask'))">

              <!-- Selection Mode Checkbox -->
              <div v-if="settingsStore.inSelectionMode" class="selection-checkbox"
                :class="{ checked: settingsStore.focusModeTaskIds.includes(task.id) }">
                <Check :size="12" class="check-icon-inner" v-if="settingsStore.focusModeTaskIds.includes(task.id)" />
              </div>

              <!-- Standard Status Icons -->
              <template v-else>
                <div v-if="task.status === 'completed'" class="check-circle-wrapper">
                  <Check :size="14" class="check-icon-inner" />
                </div>
                <div v-else-if="task.status === 'in-progress'" class="progress-circle-wrapper">
                  <div class="inner-dot"></div>
                </div>
                <div v-else class="empty-circle"></div>
              </template>
            </button>

            <div class="task-content">
              <div class="task-main-info">
                <h4 class="task-title">{{ task.title }}</h4>
                <div class="task-meta">
                  <span v-if="task.categoryId" class="task-category-dot"
                    :style="{ backgroundColor: todoStore.categoriesById.get(task.categoryId)?.color }"></span>
                  <div class="task-time" v-if="task.deadline">
                    <Clock :size="12" />
                    <span>{{ formatTime(task.deadline) }}</span>
                  </div>
                  <div class="task-subtasks" v-if="(todoStore.subtasksByTodoId.get(task.id)?.length || 0) > 0">
                    <List :size="12" />
                    <span>
                      {{todoStore.subtasksByTodoId.get(task.id)?.filter(s => s.completed).length}}/{{
                        todoStore.subtasksByTodoId.get(task.id)?.length }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button class="task-star-btn" @click.stop="togglePriority(task)"
              :class="{ active: task.priority === 'high' }">
              <Star :size="20" :class="{ 'star-filled': task.priority === 'high' }" />
            </button>
          </div>
        </TransitionGroup>
      </div>
    </TransitionGroup>

    <!-- Completed Tasks Accordion -->
    <div v-if="completedTasks.length > 0" class="completed-accordion">
      <button class="accordion-header" @click="isCompletedOpen = !isCompletedOpen">
        <span class="accordion-title">{{ t('tasks.filters.completed') }} ({{ completedTasks.length }})</span>
        <div class="accordion-icon" :class="{ open: isCompletedOpen }">
          <ChevronRight :size="16" />
        </div>
      </button>

      <div v-if="isCompletedOpen" class="accordion-content">
        <div v-for="task in completedTasks" :key="task.id" class="task-card completed"
          @click="router.push(`/task/${task.id}`)">
          <button @click.stop="todoStore.toggleTodoCompletion(task.id)" class="task-checkbox-btn">
            <div class="check-circle-wrapper">
              <Check :size="14" class="check-icon-inner" />
            </div>
          </button>

          <div class="task-content">
            <div class="task-main-info">
              <h4 class="task-title">{{ task.title }}</h4>
            </div>
          </div>

          <button class="task-star-btn" @click.stop="togglePriority(task)"
            :class="{ active: task.priority === 'high' }">
            <Star :size="20" :class="{ 'star-filled': task.priority === 'high' }" />
          </button>
        </div>
      </div>
    </div>

    <FilterModal :isOpen="showFilterModal" :active-filter="activeFilter" :active-category="activeCategoryId || null"
      @update:filter="activeFilter = $event as any"
      @update:category="(id) => router.replace({ query: { category: id } })" @close="showFilterModal = false" />

    <div v-if="filteredTasks.length === 0 && completedTasks.length === 0" class="empty-state">
      <p v-if="todoStore.searchQuery">{{ t('tasks.noResults') }}</p>
      <p v-else>{{ t('tasks.noTasks') }}</p>
    </div>

    <!-- Focus Mode FAB -->
    <div class="focus-fab-container" v-if="settingsStore.inSelectionMode && settingsStore.focusModeTaskIds.length > 0">
      <button class="focus-fab" @click="enterFocusMode">
        <span class="focus-fab-text">{{ t('focus.enter') }} ({{ settingsStore.focusModeTaskIds.length }})</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.task-list-view {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg) var(--spacing-xs) 5rem;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
  gap: var(--spacing-lg);
}

.view-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.view-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  padding: var(--spacing-xs) var(--spacing-sm) var(--spacing-xs) 0;
  border-radius: var(--radius-md);
  transition: background 0.2s;
  flex-shrink: 0;
}

.reset-btn {
  background: var(--color-bg-lavender);
  border: none;
  color: var(--color-primary);
  padding: 2px;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: var(--color-primary);
  color: white;
}

.view-selector:hover {
  background: var(--color-bg-lavender);
}

.view-title {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.rotate-90 {
  transform: rotate(90deg);
  color: var(--color-text-secondary);
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 240px;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) calc(var(--spacing-md) * 2 + 14px) var(--spacing-sm) calc(var(--spacing-md) * 2 + 18px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  background: var(--color-bg-white);
  color: var(--color-text-primary);
  transition: all 0.2s;
}

.search-clear-btn {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-bg-lavender);
  border: none;
  color: var(--color-primary);
  padding: 2px;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.search-clear-btn:hover {
  background: var(--color-primary);
  color: white;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
}

.dark .search-input {
  background: var(--color-bg-lighter);
}

/* Added styles for accordion */
.completed-accordion {
  margin-top: var(--spacing-2xl);
  border-top: 1px solid var(--color-border-light);
  padding-top: var(--spacing-lg);
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
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.accordion-icon {
  transition: transform 0.2s ease;
}

.accordion-icon.open {
  transform: rotate(90deg);
}

.accordion-content {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
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

.task-sections {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2xl);
}

.task-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  cursor: pointer;
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

.task-subtasks {
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

/* Focus Mode Styles */
.task-card.selected {
  border-color: var(--color-primary);
  background-color: var(--color-bg-lavender);
}

.dark .task-card.selected {
  background-color: rgba(108, 92, 231, 0.15);
  border-color: var(--color-primary);
}

.selection-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-text-muted);
  border-radius: 4px;
  /* Square for selection */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
}

.selection-checkbox.checked {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.task-card:hover .selection-checkbox {
  border-color: var(--color-primary);
}

.focus-fab-container {
  position: fixed;
  bottom: 5rem;
  /* Above bottom nav */
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 var(--spacing-lg);
  z-index: 100;
  pointer-events: none;
  /* Let clicks pass through container */
}

.focus-fab {
  pointer-events: auto;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  padding: var(--spacing-md) var(--spacing-xl);
  font-weight: var(--font-weight-bold);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  transform: translateY(0);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.focus-fab:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: var(--shadow-xl);
}

.focus-fab:active {
  transform: translateY(0) scale(0.95);
}

@media (min-width: 769px) {
  .focus-fab-container {
    bottom: 3rem;
    left: 280px;
    /* Sidebar width */
    justify-content: center;
    width: auto;
  }
}
</style>
