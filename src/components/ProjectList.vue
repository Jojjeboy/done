<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'

const router = useRouter()
const todoStore = useTodoStore()

const newProjectTitle = ref('')
const newProjectColor = ref('#6366f1')
const showAddForm = ref(false)
const isAdding = ref(false)

const colors = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#14b8a6', // teal
]

const handleAddProject = async () => {
  if (!newProjectTitle.value.trim()) {
    return
  }

  try {
    isAdding.value = true
    await todoStore.addProject(newProjectTitle.value.trim(), newProjectColor.value)
    newProjectTitle.value = ''
    showAddForm.value = false
  } catch (error) {
    console.error('Failed to add project:', error)
    alert('Failed to add project. Please try again.')
  } finally {
    isAdding.value = false
  }
}

const handleDeleteProject = async (projectId: string) => {
  if (!confirm('Are you sure you want to delete this project? All lists and tasks will be deleted.')) {
    return
  }

  try {
    await todoStore.deleteProject(projectId)
  } catch (error) {
    console.error('Failed to delete project:', error)
    alert('Failed to delete project. Please try again.')
  }
}

const navigateToProject = (projectId: string) => {
  router.push(`/project/${projectId}`)
}

onMounted(async () => {
  if (!todoStore.initialized) {
    await todoStore.initialize()
  }
})
</script>

<template>
  <div class="project-list">
    <div class="header-section">
      <h2>Projects</h2>
      <button
        v-if="!showAddForm"
        @click="showAddForm = true"
        class="btn btn-primary"
      >
        + Add Project
      </button>
    </div>

    <div v-if="showAddForm" class="add-project-form">
      <input
        v-model="newProjectTitle"
        type="text"
        placeholder="Project name"
        class="input"
        @keyup.enter="handleAddProject"
        @keyup.esc="showAddForm = false"
      />
      <div class="color-picker">
        <button
          v-for="color in colors"
          :key="color"
          :style="{ backgroundColor: color }"
          :class="{ active: newProjectColor === color }"
          class="color-btn"
          @click="newProjectColor = color"
        />
      </div>
      <div class="form-actions">
        <button @click="handleAddProject" class="btn btn-primary" :disabled="isAdding">
          {{ isAdding ? 'Adding...' : 'Add' }}
        </button>
        <button @click="showAddForm = false" class="btn btn-secondary">Cancel</button>
      </div>
    </div>

    <div v-if="todoStore.loading" class="loading">Loading projects...</div>

    <div v-else-if="todoStore.projects.length === 0" class="empty-state">
      <p>No projects yet. Create your first project to get started!</p>
    </div>

    <div v-else class="projects-grid">
      <div
        v-for="project in todoStore.projects"
        :key="project.id"
        class="project-card"
        @click="navigateToProject(project.id)"
      >
        <div class="project-header">
          <div
            class="project-color"
            :style="{ backgroundColor: project.color }"
          />
          <h3>{{ project.title }}</h3>
          <button
            @click.stop="handleDeleteProject(project.id)"
            class="delete-btn"
            aria-label="Delete project"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-list {
  width: 100%;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.add-project-form {
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

.color-picker {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.active {
  border-color: #ffffff;
  transform: scale(1.15);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.7);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.project-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.project-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-card h3 {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.delete-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
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

@media (max-width: 640px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }

  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
