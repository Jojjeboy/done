<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { Check, Clock, Star, List, ChevronRight, Search, X, Pin } from 'lucide-vue-next'
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

const activeProjectId = computed(() => route.query.category as string | undefined)

const showFilterModal = ref(false)

const resetFilters = () => {
  activeFilter.value = 'all'
  router.replace({ query: {} })
}

const currentViewLabel = computed(() => {
  if (activeProjectId.value) {
    if (activeProjectId.value === '__none__') {
      return t('tasks.categories.none')
    }
    return todoStore.projectsById.get(activeProjectId.value)?.title || t('modal.project')
  }
  return t(`tasks.filters.${activeFilter.value}`)
})

// Get all tasks from all lists, filtered by category if active
const allTasks = computed(() => {
  let tasks = todoStore.todoItems

  if (activeProjectId.value) {
    if (activeProjectId.value === '__none__') {
      tasks = tasks.filter(t => t.categoryId === null)
    } else {
      tasks = tasks.filter(t => t.categoryId === activeProjectId.value)
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
  const now = new Date()
  const currentYear = now.getFullYear()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const getLocalDateKey = (deadline: number) => {
    const d = new Date(deadline)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const todayKey = getLocalDateKey(today.getTime())
  const tomorrowKey = getLocalDateKey(tomorrow.getTime())

  // Filter out sticky tasks from the main groups first to avoid confusion
  const nonStickyTasks = filteredTasks.value.filter(t => !t.isSticky || t.status === 'completed')

  nonStickyTasks.forEach((task) => {
    let dateKey: string
    if (!task.deadline) {
      dateKey = 'no-date'
    } else {
      const taskKey = getLocalDateKey(task.deadline)
      if (taskKey === todayKey) dateKey = 'today'
      else if (taskKey === tomorrowKey) dateKey = 'tomorrow'
      else dateKey = taskKey
    }

    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(task)
  })

  // We want an array of groups in the correct order
  const result: { key: string; label: string; tasks: TodoItem[] }[] = []

  const formatLabel = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'long' }
    if (date.getFullYear() !== currentYear) {
      options.year = 'numeric'
    }
    return date.toLocaleDateString('sv-SE', options).toUpperCase()
  }

  const allDateKeys = Array.from(groups.keys()).filter(k => k !== 'today' && k !== 'tomorrow' && k !== 'no-date')
  allDateKeys.sort((a, b) => a.localeCompare(b))

  const pastKeys = allDateKeys.filter(k => k < todayKey)
  const futureKeys = allDateKeys.filter(k => k > tomorrowKey)

  // Sort past keys ASCENDING (oldest first)
  pastKeys.sort((a, b) => a.localeCompare(b))

  // Sort future keys ASCENDING (closest first)
  futureKeys.sort((a, b) => a.localeCompare(b))

  // Assemble the map in order: Past -> Today -> Tomorrow -> Future -> No Date

  // Past (Chronological: oldest first)
  pastKeys.forEach(key => {
    const tasks = groups.get(key)!
    const parts = key.split('-').map(Number)
    if (parts.length === 3 && parts[0] != null && parts[1] != null && parts[2] != null) {
      const date = new Date(parts[0], parts[1] - 1, parts[2])
      result.push({
        key,
        label: formatLabel(date),
        tasks
      })
    }
  })

  // Today
  if (groups.has('today')) {
    result.push({
      key: 'today',
      label: `${t('tasks.today')} ${today.toLocaleDateString('sv-SE', { weekday: 'long' })}`.toUpperCase(),
      tasks: groups.get('today')!
    })
  }

  // Tomorrow
  if (groups.has('tomorrow')) {
    result.push({
      key: 'tomorrow',
      label: `${t('tasks.tomorrow')} ${tomorrow.toLocaleDateString('sv-SE', { weekday: 'long' })}`.toUpperCase(),
      tasks: groups.get('tomorrow')!
    })
  }

  // Future (Chronological: closest first)
  futureKeys.forEach(key => {
    const tasks = groups.get(key)!
    const parts = key.split('-').map(Number)
    if (parts.length === 3 && parts[0] != null && parts[1] != null && parts[2] != null) {
      const date = new Date(parts[0], parts[1] - 1, parts[2])
      result.push({
        key,
        label: formatLabel(date),
        tasks
      })
    }
  })

  // No Date
  if (groups.has('no-date')) {
    result.push({
      key: 'no-date',
      label: t('tasks.noDate').toUpperCase(),
      tasks: groups.get('no-date')!
    })
  }

  // Handle Sticky
  const stickyTasks = filteredTasks.value
    .filter(t => t.isSticky && t.status !== 'completed')
    .sort((a, b) => (a.deadline || Infinity) - (b.deadline || Infinity))

  if (stickyTasks.length > 0) {
    result.unshift({
      key: 'sticky',
      label: t('tasks.sticky').toUpperCase(),
      tasks: stickyTasks
    })
  }

  return result
})

const togglePriority = async (task: TodoItem) => {
  const newPriority = task.priority === 'high' ? 'medium' : 'high'
  try {
    await todoStore.updateTodoItem(task.id, { priority: newPriority })
  } catch (error) {
    console.error('Failed to toggle priority:', error)
  }
}



/**
 * Checks if a task is overdue (deadline is today or in the past).
 * Used for applying red highlighting in the UI.
 *
 * @param deadline - The timestamp of the deadline
 * @returns true if the task is due today or earlier
 */
const isOverdue = (deadline: number | null) => {
  if (!deadline) return false
  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)

  // If task date is equal to or before today, mark as overdue (red)
  // Note: Future dates (tomorrow and beyond) will return false
  return taskDate.getTime() <= today.getTime()
}

const formatTime = (deadline: number | null) => {
  if (!deadline) return ''
  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const taskDate = new Date(date)
  taskDate.setHours(0, 0, 0, 0)

  if (taskDate.getTime() === today.getTime()) {
    return t('tasks.today')
  } else if (taskDate.getTime() === yesterday.getTime()) {
    return t('tasks.yesterday')
  } else if (taskDate.getTime() === tomorrow.getTime()) {
    return t('tasks.tomorrow')
  } else {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    if (date.getFullYear() !== today.getFullYear()) {
      options.year = 'numeric'
    }
    return date.toLocaleDateString('sv-SE', options)
  }
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
        <button v-if="activeFilter !== 'all' || activeProjectId" class="reset-btn" @click="resetFilters"
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
      <div v-for="group in tasksByDate" :key="group.key" class="task-section">
        <h3 class="section-title">{{ group.label }}</h3>
        <TransitionGroup name="list" tag="div" class="tasks">
          <div v-for="task in group.tasks" :key="task.id" class="task-card" :class="{
            completed: task.status === 'completed',
            selected: settingsStore.focusModeTaskIds.includes(task.id),
            active: route.params.id === task.id
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
                <div class="task-title-row">
                  <h4 class="task-title">{{ task.title }}</h4>
                </div>
                <div class="task-meta-row">
                  <div v-if="task.categoryId && todoStore.projectsById.has(task.categoryId)" class="task-category-info">
                    <span class="task-category-dot"
                      :style="{ backgroundColor: todoStore.projectsById.get(task.categoryId)?.color }"></span> &nbsp;
                    <span class="task-category-name">{{ todoStore.projectsById.get(task.categoryId)?.title }}</span>
                  </div>
                  <div class="task-time" v-if="task.deadline" :class="{ 'is-today': isOverdue(task.deadline) }">
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

            <div class="task-actions">
              <Pin v-if="task.isSticky" :size="16" class="sticky-icon" fill="currentColor" />
              <button class="task-star-btn" @click.stop="togglePriority(task)"
                :class="{ active: task.priority === 'high' }">
                <Star :size="20" :class="{ 'star-filled': task.priority === 'high' }" />
              </button>
            </div>
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
        <div v-for="task in completedTasks" :key="task.id" class="task-card completed" @click="handleTaskClick(task)">
          <button @click.stop="todoStore.toggleTodoCompletion(task.id)" class="task-checkbox-btn">
            <div class="check-circle-wrapper">
              <Check :size="14" class="check-icon-inner" />
            </div>
          </button>

          <div class="task-content">
            <div class="task-main-info">
              <h4 class="task-title">{{ task.title }}</h4>
              <div class="task-meta-row">
                <div v-if="task.categoryId && todoStore.projectsById.has(task.categoryId)" class="task-category-info">
                  <span class="task-category-dot"
                    :style="{ backgroundColor: todoStore.projectsById.get(task.categoryId)?.color }"></span>
                  <span class="task-category-name">{{ todoStore.projectsById.get(task.categoryId)?.title }}</span>
                </div>
                <div class="task-time" v-if="task.deadline" :class="{ 'is-today': isOverdue(task.deadline) }">
                  <Clock :size="12" />
                  <span>{{ formatTime(task.deadline) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="task-actions">
            <Pin v-if="task.isSticky" :size="16" class="sticky-icon" fill="currentColor" />
            <button class="task-star-btn" @click.stop="togglePriority(task)"
              :class="{ active: task.priority === 'high' }">
              <Star :size="20" :class="{ 'star-filled': task.priority === 'high' }" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <FilterModal :isOpen="showFilterModal" :active-filter="activeFilter" :active-category="activeProjectId || null"
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
  align-items: flex-start;
  /* Changed from center to flex-start */
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

.task-card.active {
  border-color: var(--color-primary);
  background-color: var(--color-bg-lavender);
  box-shadow: var(--shadow-md);
}

.dark .task-card.active {
  background-color: rgba(108, 92, 231, 0.1);
  border-color: var(--color-primary);
}

.task-checkbox-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 0 0 0;
  /* Add top padding to align with title */
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
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
}

.sticky-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.task-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  line-height: var(--line-height-normal);
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.task-category-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.task-category-name {
  font-size: 10px;
  color: var(--color-text-muted);
  font-weight: 500;
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
  font-size: 10px;
}

.task-time.is-today {
  color: #ff4757;
}

.task-time.is-today span {
  font-weight: 600;
}

.task-subtasks {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-muted);
  font-size: 10px;
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

.task-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-left: auto;
  align-self: center;
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
