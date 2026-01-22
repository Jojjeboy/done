<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { Check, Square } from 'lucide-vue-next'
import type { TodoItem } from '@/types/todo'

const todoStore = useTodoStore()
useI18n()

const selectedDate = ref(new Date())
selectedDate.value.setHours(0, 0, 0, 0)

const categoryColors: Record<TodoItem['category'], string> = {
  work: '#F59E0B',
  lifestyle: '#10B981',
  personal: '#3B82F6',
  hobby: '#EF4444',
  none: '#9CA3AF',
}

const categoryLabels: Record<TodoItem['category'], string> = {
  work: 'Work',
  lifestyle: 'Lifestyle',
  personal: 'Personal',
  hobby: 'Hobby',
  none: 'No list',
}

// Get all tasks from all lists
const allTasks = computed(() => {
  return todoStore.todoItems
})

// Group tasks by date
const tasksByDate = computed(() => {
  const groups = new Map<string, TodoItem[]>()

  allTasks.value.forEach((task) => {
    let dateKey: string

    if (!task.deadline) {
      // Tasks without deadline go to "No date"
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
  const newStatus = task.status === 'completed' ? 'pending' : 'completed'
  try {
    await todoStore.updateTodoItem(task.id, { status: newStatus })
  } catch (error) {
    console.error('Failed to toggle task:', error)
  }
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
        <h3 class="section-date">{{ group.label }}</h3>
        <TransitionGroup
          name="list"
          tag="div"
          class="tasks"
        >
          <div
            v-for="task in group.tasks"
            :key="task.id"
            class="task-row"
          >
            <button
              @click="toggleTask(task)"
              class="task-checkbox-btn"
              :aria-label="task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'"
            >
              <Check
                v-if="task.status === 'completed'"
                class="w-5 h-5 text-green-500"
              />
              <Square
                v-else
                class="w-5 h-5 text-gray-400"
              />
            </button>
            <span
              :class="[
                'task-title',
                task.status === 'completed' ? 'completed' : ''
              ]"
            >
              {{ task.title }}
            </span>
            <span
              class="category-badge"
              :style="{ color: categoryColors[task.category] }"
            >
              <span
                class="category-dot"
                :style="{ backgroundColor: categoryColors[task.category] }"
              />
              {{ categoryLabels[task.category] }}
            </span>
          </div>
        </TransitionGroup>
      </div>
    </TransitionGroup>

    <div v-if="allTasks.length === 0" class="empty-state">
      <p>No tasks yet. Add your first task!</p>
    </div>
  </div>
</template>

<style scoped>
.task-list-view {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 5rem; /* Space for bottom nav */
}

.task-sections {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0 1rem;
}

.task-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-date {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6B7280;
  text-transform: capitalize;
  padding: 0 0.5rem;
}

.dark .section-date {
  color: #9CA3AF;
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.task-row:hover {
  background-color: #F9FAFB;
}

.dark .task-row:hover {
  background-color: #2A2A2A;
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

.task-title {
  flex: 1;
  font-size: 0.9375rem;
  color: #111827;
  text-align: left;
}

.dark .task-title {
  color: #F9FAFB;
}

.task-title.completed {
  text-decoration: line-through;
  color: #9CA3AF;
  opacity: 0.7;
}

.dark .task-title.completed {
  color: #6B7280;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #9CA3AF;
}

.dark .empty-state {
  color: #6B7280;
}
</style>
