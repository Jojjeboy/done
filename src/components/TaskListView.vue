<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { Check, Clock, Star, List, ChevronRight, Search } from 'lucide-vue-next'
import type { TodoItem } from '@/types/todo'
import FilterModal from '@/components/FilterModal.vue'

const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const emit = defineEmits<{
  'edit-task': [taskId: string]
}>()

type FilterType = 'all' | 'todo' | 'in-progress' | 'completed' | 'starred'
const activeFilter = ref<FilterType>('all')

const activeCategoryId = computed(() => route.query.category as string | undefined)

const showFilterModal = ref(false)

const currentViewLabel = computed(() => {
    if (activeCategoryId.value) {
        return todoStore.categoriesById.get(activeCategoryId.value)?.title || 'Category'
    }
    return t(`tasks.filters.${activeFilter.value}`)
})

// Get all tasks from all lists, filtered by category if active
const allTasks = computed(() => {
  let tasks = todoStore.todoItems

  if (activeCategoryId.value) {
    tasks = tasks.filter(t => t.categoryId === activeCategoryId.value)
  }

  // Filter out completed if setting is enabled, ONLY if not explicitly viewing 'completed' tab
  if (settingsStore.hideCompleted && activeFilter.value !== 'completed') {
    tasks = tasks.filter(t => t.status !== 'completed')
  }

  return tasks
})

const completedTasks = computed(() => {
  // Only show separate completed list if we are in 'all' filter and not hiding completed globally
  if (activeFilter.value === 'all' && !settingsStore.hideCompleted) {
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
       <div class="view-selector" @click="showFilterModal = true">
          <h2 class="view-title">{{ currentViewLabel }}</h2>
          <ChevronRight :size="20" class="rotate-90" />
       </div>

       <div class="search-container">
           <Search :size="18" class="search-icon" />
           <input
              v-model="todoStore.searchQuery"
              type="text"
              class="search-input"
              :placeholder="t('search.placeholder')"
           />
       </div>
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
            @click="emit('edit-task', task.id)"
          >
            <button
              @click.stop="todoStore.toggleTodoCompletion(task.id)"
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
                  <div class="task-subtasks" v-if="(todoStore.subtasksByTodoId.get(task.id)?.length || 0) > 0">
                    <List :size="12" />
                    <span>
                      {{ todoStore.subtasksByTodoId.get(task.id)?.filter(s => s.completed).length }}/{{ todoStore.subtasksByTodoId.get(task.id)?.length }}
                    </span>
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

    <!-- Completed Tasks Accordion -->
    <div v-if="completedTasks.length > 0" class="completed-accordion">
      <button class="accordion-header" @click="isCompletedOpen = !isCompletedOpen">
        <span class="accordion-title">{{ t('tasks.filters.completed') }} ({{ completedTasks.length }})</span>
        <div class="accordion-icon" :class="{ open: isCompletedOpen }">
             <ChevronRight :size="16" />
        </div>
      </button>

      <div v-if="isCompletedOpen" class="accordion-content">
          <div
            v-for="task in completedTasks"
            :key="task.id"
            class="task-card completed"
            @click="emit('edit-task', task.id)"
          >
            <button
              @click.stop="todoStore.toggleTodoCompletion(task.id)"
              class="task-checkbox-btn"
            >
              <div class="check-circle-wrapper">
                <Check :size="14" class="check-icon-inner" />
              </div>
            </button>

            <div class="task-content">
              <div class="task-main-info">
                <h4 class="task-title">{{ task.title }}</h4>
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
      </div>
    </div>

    <FilterModal
        :isOpen="showFilterModal"
        :active-filter="activeFilter"
        :active-category="activeCategoryId || null"
        @update:filter="activeFilter = $event as any"
        @update:category="(id) => router.replace({ query: { category: id } })"
        @close="showFilterModal = false"
    />

    <div v-if="filteredTasks.length === 0 && completedTasks.length === 0" class="empty-state">
      <p v-if="todoStore.searchQuery">No search results</p>
      <p v-else>No tasks to show</p>
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

.view-selector:hover {
    background: var(--color-bg-lavender);
}

.view-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
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
    padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) calc(var(--spacing-md) * 2 + 18px);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    background: var(--color-bg-white);
    color: var(--color-text-primary);
    transition: all 0.2s;
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
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
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
</style>
