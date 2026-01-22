<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { Plus, X } from 'lucide-vue-next'

const router = useRouter()
const todoStore = useTodoStore()
const { t } = useI18n()

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
    alert(t('projects.deleteConfirm'))
  } finally {
    isAdding.value = false
  }
}

const handleDeleteProject = async (projectId: string) => {
  if (!confirm(t('projects.deleteConfirm'))) {
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
    try {
      await todoStore.initialize()
    } catch (error) {
      console.error('Failed to initialize todo store:', error)
    }
  }
})
</script>

<template>
  <div class="project-list">
    <h2 class="section-title">
      {{ t('projects.title') }}
    </h2>

    <button
      v-if="!showAddForm"
      @click="showAddForm = true"
      class="add-project-btn"
    >
      <Plus class="w-4 h-4" />
      <span>{{ t('projects.addProject') }}</span>
    </button>

    <Transition name="fade">
      <div v-if="showAddForm" class="add-form-card soft-card">
        <input
          v-model="newProjectTitle"
          type="text"
          :placeholder="t('projects.projectName')"
          class="soft-input"
          @keyup.enter="handleAddProject"
          @keyup.esc="showAddForm = false"
        />
        <div class="color-picker">
          <button
            v-for="color in colors"
            :key="color"
            :style="{ backgroundColor: color }"
            :class="[
              'color-btn',
              newProjectColor === color ? 'selected' : ''
            ]"
            @click="newProjectColor = color"
          />
        </div>
        <div class="form-actions">
          <button
            @click="handleAddProject"
            class="soft-button flex-1"
            :disabled="isAdding"
          >
            {{ isAdding ? '...' : t('common.add') }}
          </button>
          <button
            @click="showAddForm = false"
            class="soft-button flex-1 bg-gray-100 dark:bg-gray-700 text-soft dark:text-gray-200"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </Transition>

    <div v-if="todoStore.loading" class="loading-state">
      Loading projects...
    </div>

    <div v-else-if="todoStore.projects.length === 0" class="empty-state">
      <p>{{ t('projects.noProjects') }}</p>
    </div>

    <TransitionGroup
      v-else
      name="list"
      tag="div"
      class="projects-list"
    >
      <div
        v-for="project in todoStore.projects"
        :key="project.id"
        class="project-card"
        @click="navigateToProject(project.id)"
      >
        <div class="project-dot" :style="{ backgroundColor: project.color }" />
        <h3 class="project-name">{{ project.title }}</h3>
        <button
          @click.stop="handleDeleteProject(project.id)"
          class="project-delete-btn"
          :aria-label="t('common.delete')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.project-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
  letter-spacing: -0.02em;
}

.dark .section-title {
  color: #E5E5E5;
}

.add-project-btn {
  background-color: #ffffff;
  border-radius: 0.75rem;
  padding: 0.875rem 1.25rem;
  font-weight: 600;
  font-size: 0.9375rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  color: #1A1A1A;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
}

.dark .add-project-btn {
  background-color: #2A2A2A;
  color: #E5E5E5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.add-project-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.dark .add-project-btn:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.add-form-card {
  margin-top: 0.5rem;
}

.color-picker {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.color-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.selected {
  border-color: #1A1A1A;
  transform: scale(1.15);
}

.dark .color-btn.selected {
  border-color: #E5E5E5;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: #6B7280;
}

.dark .loading-state,
.dark .empty-state {
  color: #9CA3AF;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-card {
  background-color: #ffffff;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.dark .project-card {
  background-color: #2A2A2A;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.project-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dark .project-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.project-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.project-name {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.dark .project-name {
  color: #E5E5E5;
}

.project-delete-btn {
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
  opacity: 0.6;
}

.project-card:hover .project-delete-btn {
  opacity: 1;
}

.project-delete-btn:hover {
  color: #EF4444;
  background-color: #FEE2E2;
}

.dark .project-delete-btn:hover {
  color: #F87171;
  background-color: #7F1D1D;
}
</style>
