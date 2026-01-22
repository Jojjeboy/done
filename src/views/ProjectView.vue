<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LayoutWrapper from '@/components/Layout.vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Plus, X, CheckCircle2, Circle } from 'lucide-vue-next'
import type { TodoItem } from '@/types/todo'

const route = useRoute()
const router = useRouter()
const todoStore = useTodoStore()
const { t } = useI18n()

const projectId = computed(() => route.params.id as string)
const project = computed(() => todoStore.projectsByProjectId.get(projectId.value))
const projectLists = computed(() => todoStore.listsByProjectId.get(projectId.value) || [])

const newListTitle = ref('')
const newTaskTitle = ref('')
const selectedListId = ref<string | null>(null)
const showAddListForm = ref(false)
const showAddTaskForm = ref(false)
const isAdding = ref(false)

const getItemsForList = (listId: string) => {
  return todoStore.itemsByListId.get(listId) || []
}

const getStatusLabel = (status: TodoItem['status']) => {
  return t(`tasks.status.${status}`)
}

const handleAddList = async () => {
  if (!newListTitle.value.trim()) {
    return
  }

  try {
    isAdding.value = true
    await todoStore.addTodoList(projectId.value, newListTitle.value.trim())
    newListTitle.value = ''
    showAddListForm.value = false
  } catch (error) {
    console.error('Failed to add list:', error)
    alert('Failed to add list. Please try again.')
  } finally {
    isAdding.value = false
  }
}

const handleAddTask = async () => {
  if (!newTaskTitle.value.trim() || !selectedListId.value) {
    return
  }

  try {
    isAdding.value = true
    await todoStore.addTodoItem(selectedListId.value, newTaskTitle.value.trim(), '', 'medium', null, 'none')
    newTaskTitle.value = ''
    showAddTaskForm.value = false
    selectedListId.value = null
  } catch (error) {
    console.error('Failed to add task:', error)
    alert('Failed to add task. Please try again.')
  } finally {
    isAdding.value = false
  }
}

const handleDeleteTask = async (taskId: string) => {
  if (!confirm(t('projects.deleteTaskConfirm'))) {
    return
  }

  try {
    await todoStore.deleteTodoItem(taskId)
  } catch (error) {
    console.error('Failed to delete task:', error)
    alert('Failed to delete task. Please try again.')
  }
}

const toggleTaskStatus = async (task: TodoItem) => {
  const newStatus =
    task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in-progress' : 'completed'
  try {
    await todoStore.updateTodoItem(task.id, { status: newStatus })
  } catch (error) {
    console.error('Failed to update task:', error)
  }
}

onMounted(async () => {
  if (!todoStore.initialized) {
    try {
      await todoStore.initialize()
    } catch (error) {
      console.error('Failed to initialize todo store:', error)
      router.push('/')
      return
    }
  }

  if (!project.value) {
    router.push('/')
  }
})
</script>

<template>
  <LayoutWrapper>
    <div class="project-view space-y-6">
      <div class="flex items-center gap-4">
        <button
          @click="router.push('/')"
          class="back-button"
          :aria-label="t('common.back')"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h2 v-if="project" class="text-2xl font-bold text-soft dark:text-gray-100 tracking-tight">
          {{ project.title }}
        </h2>
      </div>

      <div v-if="!project" class="text-center py-12 text-red-500">
        Project not found
      </div>

      <div v-else class="space-y-6">
        <div class="flex flex-wrap gap-3">
          <button
            v-if="!showAddListForm"
            @click="showAddListForm = true"
            class="add-btn"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('lists.addList') }}</span>
          </button>

          <button
            v-if="projectLists.length > 0 && !showAddTaskForm"
            @click="showAddTaskForm = true"
            class="add-btn"
          >
            <Plus class="w-4 h-4" />
            <span>{{ t('tasks.addTask') }}</span>
          </button>
        </div>

        <Transition name="fade">
          <div v-if="showAddListForm" class="soft-card space-y-4">
            <input
              v-model="newListTitle"
              type="text"
              :placeholder="t('lists.listName')"
              class="soft-input"
              @keyup.enter="handleAddList"
              @keyup.esc="showAddListForm = false"
            />
            <div class="flex gap-3">
              <button
                @click="handleAddList"
                class="soft-button flex-1"
                :disabled="isAdding"
              >
                {{ isAdding ? '...' : t('common.add') }}
              </button>
              <button
                @click="showAddListForm = false"
                class="soft-button flex-1 bg-gray-100 dark:bg-gray-700 text-soft dark:text-gray-200"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </Transition>

        <Transition name="fade">
          <div v-if="showAddTaskForm" class="soft-card space-y-4">
            <select v-model="selectedListId" class="soft-input">
              <option :value="null">{{ t('tasks.selectList') }}</option>
              <option v-for="list in projectLists" :key="list.id" :value="list.id">
                {{ list.title }}
              </option>
            </select>
            <input
              v-model="newTaskTitle"
              type="text"
              :placeholder="t('tasks.taskName')"
              class="soft-input"
              @keyup.enter="handleAddTask"
              @keyup.esc="showAddTaskForm = false"
            />
            <div class="flex gap-3">
              <button
                @click="handleAddTask"
                class="soft-button flex-1"
                :disabled="isAdding || !selectedListId"
              >
                {{ isAdding ? '...' : t('common.add') }}
              </button>
              <button
                @click="showAddTaskForm = false"
                class="soft-button flex-1 bg-gray-100 dark:bg-gray-700 text-soft dark:text-gray-200"
              >
                {{ t('common.cancel') }}
              </button>
            </div>
          </div>
        </Transition>

        <div v-if="projectLists.length === 0" class="text-center py-12 text-soft-muted">
          <p>{{ t('lists.noLists') }}</p>
        </div>

        <TransitionGroup
          v-else
          name="list"
          tag="div"
          class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <div v-for="list in projectLists" :key="list.id" class="soft-card space-y-4">
            <h3 class="text-xl font-semibold text-soft dark:text-gray-100">
              {{ list.title }}
            </h3>
            <div v-if="getItemsForList(list.id).length === 0" class="text-sm text-soft-muted py-4">
              No tasks yet
            </div>
            <TransitionGroup
              v-else
              name="list"
              tag="div"
              class="space-y-2"
            >
              <div
                v-for="task in getItemsForList(list.id)"
                :key="task.id"
                class="task-item"
              >
                <button
                  @click="toggleTaskStatus(task)"
                  class="task-checkbox-btn"
                  :aria-label="getStatusLabel(task.status)"
                >
                  <CheckCircle2 v-if="task.status === 'completed'" class="w-5 h-5 text-green-500" />
                  <Circle v-else class="w-5 h-5 text-gray-400" />
                </button>
                <span
                  :class="[
                    'flex-1 text-sm text-soft dark:text-gray-200',
                    task.status === 'completed' ? 'line-through opacity-60' : ''
                  ]"
                >
                  {{ task.title }}
                </span>
                <span
                  class="status-badge"
                >
                  {{ getStatusLabel(task.status) }}
                </span>
                <button
                  @click="handleDeleteTask(task.id)"
                  class="task-delete-btn"
                  :aria-label="t('common.delete')"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </TransitionGroup>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </LayoutWrapper>
</template>

<style scoped>
.project-view {
  width: 100%;
}

.back-button {
  background-color: #ffffff;
  border-radius: 0.625rem;
  padding: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  color: #1A1A1A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .back-button {
  background-color: #2A2A2A;
  color: #E5E5E5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.dark .back-button:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.add-btn {
  background-color: #ffffff;
  border-radius: 0.75rem;
  padding: 0.75rem 1.25rem;
  font-weight: 600;
  font-size: 0.9375rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  color: #1A1A1A;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dark .add-btn {
  background-color: #2A2A2A;
  color: #E5E5E5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
}

.dark .add-btn:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
}

.task-item {
  background-color: #F9FAFB;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
}

.dark .task-item {
  background-color: #1F1F1F;
}

.task-checkbox-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.task-checkbox-btn:hover {
  transform: scale(1.1);
}

.task-checkbox-btn:active {
  transform: scale(0.95);
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background-color: #E5E7EB;
  color: #6B7280;
  text-transform: capitalize;
  font-weight: 500;
}

.dark .status-badge {
  background-color: #404040;
  color: #9CA3AF;
}

.task-delete-btn {
  background: transparent;
  border: none;
  color: #9CA3AF;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-delete-btn:hover {
  color: #EF4444;
  background-color: #FEE2E2;
}

.dark .task-delete-btn:hover {
  color: #F87171;
  background-color: #7F1D1D;
}
</style>
