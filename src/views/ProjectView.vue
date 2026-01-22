<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/Layout.vue'
import { useTodoStore } from '@/stores/todo'

const route = useRoute()
const router = useRouter()
const todoStore = useTodoStore()

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
    await todoStore.addTodoItem(selectedListId.value, newTaskTitle.value.trim())
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
  if (!confirm('Are you sure you want to delete this task?')) {
    return
  }

  try {
    await todoStore.deleteTodoItem(taskId)
  } catch (error) {
    console.error('Failed to delete task:', error)
    alert('Failed to delete task. Please try again.')
  }
}

const toggleTaskStatus = async (task: any) => {
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
    await todoStore.initialize()
  }

  if (!project.value) {
    router.push('/')
  }
})
</script>

<template>
  <Layout>
    <div class="project-view">
      <div class="header-section">
        <button @click="router.push('/')" class="back-btn">← Back</button>
        <h2 v-if="project">{{ project.title }}</h2>
      </div>

      <div v-if="!project" class="error">Project not found</div>

      <div v-else>
        <div class="actions-section">
          <button
            v-if="!showAddListForm"
            @click="showAddListForm = true"
            class="btn btn-primary"
          >
            + Add List
          </button>

          <button
            v-if="projectLists.length > 0 && !showAddTaskForm"
            @click="showAddTaskForm = true"
            class="btn btn-primary"
          >
            + Add Task
          </button>
        </div>

        <div v-if="showAddListForm" class="add-form">
          <input
            v-model="newListTitle"
            type="text"
            placeholder="List name"
            class="input"
            @keyup.enter="handleAddList"
            @keyup.esc="showAddListForm = false"
          />
          <div class="form-actions">
            <button @click="handleAddList" class="btn btn-primary" :disabled="isAdding">
              {{ isAdding ? 'Adding...' : 'Add' }}
            </button>
            <button @click="showAddListForm = false" class="btn btn-secondary">Cancel</button>
          </div>
        </div>

        <div v-if="showAddTaskForm" class="add-form">
          <select v-model="selectedListId" class="input">
            <option :value="null">Select a list</option>
            <option v-for="list in projectLists" :key="list.id" :value="list.id">
              {{ list.title }}
            </option>
          </select>
          <input
            v-model="newTaskTitle"
            type="text"
            placeholder="Task name"
            class="input"
            @keyup.enter="handleAddTask"
            @keyup.esc="showAddTaskForm = false"
          />
          <div class="form-actions">
            <button @click="handleAddTask" class="btn btn-primary" :disabled="isAdding || !selectedListId">
              {{ isAdding ? 'Adding...' : 'Add' }}
            </button>
            <button @click="showAddTaskForm = false" class="btn btn-secondary">Cancel</button>
          </div>
        </div>

        <div v-if="projectLists.length === 0" class="empty-state">
          <p>No lists yet. Create your first list to get started!</p>
        </div>

        <div v-else class="lists-container">
          <div v-for="list in projectLists" :key="list.id" class="list-card">
            <h3 class="list-title">{{ list.title }}</h3>
            <div v-if="getItemsForList(list.id).length === 0" class="empty-list">
              No tasks yet
            </div>
            <div v-else class="tasks-list">
              <div
                v-for="task in getItemsForList(list.id)"
                :key="task.id"
                class="task-item"
              >
                <input
                  type="checkbox"
                  :checked="task.status === 'completed'"
                  @change="toggleTaskStatus(task)"
                  class="task-checkbox"
                />
                <span
                  :class="{
                    'task-title': true,
                    completed: task.status === 'completed',
                  }"
                >
                  {{ task.title }}
                </span>
                <span class="task-status">{{ task.status }}</span>
                <button
                  @click="handleDeleteTask(task.id)"
                  class="delete-btn"
                  aria-label="Delete task"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<style scoped>
.project-view {
  width: 100%;
}

.header-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.actions-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.add-form {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
}

select.input {
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.7);
}

.lists-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.list-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.list-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1rem 0;
}

.empty-list {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  padding: 1rem 0;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.task-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.task-title {
  flex: 1;
  color: #ffffff;
  font-size: 0.9375rem;
}

.task-title.completed {
  text-decoration: line-through;
  opacity: 0.6;
}

.task-status {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: capitalize;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.delete-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  line-height: 1;
  transition: color 0.2s;
}

.delete-btn:hover {
  color: #ffffff;
}

.btn {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #ffffff;
  color: #35495e;
}

.btn-primary:hover:not(:disabled) {
  background: #f8f9fa;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.error {
  color: #ef4444;
  padding: 2rem;
  text-align: center;
}

@media (max-width: 640px) {
  .lists-container {
    grid-template-columns: 1fr;
  }

  .actions-section {
    flex-direction: column;
  }
}
</style>
