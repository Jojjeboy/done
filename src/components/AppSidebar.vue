<script setup lang="ts">
import { ref } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useRouter, useRoute } from 'vue-router'
import {
  Home,
  Settings,
  Plus,
  Trash2,
  Edit2
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import ImportModal from '@/components/ImportModal.vue'
import ProjectDetailModal from '@/components/ProjectDetailModal.vue'

const todoStore = useTodoStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const handleCategoryClick = (categoryId: string) => {
  if (isCategoryActive(categoryId)) {
    router.push('/')
  } else {
    router.push({ path: '/', query: { category: categoryId } })
  }
}

const showImportModal = ref(false)
const showProjectDetailModal = ref(false)
const selectedProjectId = ref<string | null>(null)

const openProjectModal = (id: string) => {
  selectedProjectId.value = id
  showProjectDetailModal.value = true
}

const isActive = (path: string) => route.path === path
const isCategoryActive = (id: string) => route.query.category === id

import ConfirmationModal from '@/components/ConfirmationModal.vue'

// ... existing code ...
const showDeleteCategoryConfirm = ref(false)
const categoryToDelete = ref<string | null>(null)

const deleteProject = (id: string) => {
  categoryToDelete.value = id
  showDeleteCategoryConfirm.value = true
}

const confirmDeleteCategory = async () => {
  if (categoryToDelete.value) {
    await todoStore.deleteProject(categoryToDelete.value)
    categoryToDelete.value = null
  }
  showDeleteCategoryConfirm.value = false
}

// Drag and Drop
const draggedCategoryIndex = ref<number | null>(null)

const handleDragStart = (index: number) => {
  draggedCategoryIndex.value = index
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = async (targetIndex: number) => {
  if (draggedCategoryIndex.value === null || draggedCategoryIndex.value === targetIndex) return

  const list = [...todoStore.projects]
  const [removed] = list.splice(draggedCategoryIndex.value, 1)
  if (!removed) return
  list.splice(targetIndex, 0, removed)

  // Update order property
  const updated = list.map((cat, idx) => ({
    ...cat,
    order: idx
  }))

  await todoStore.updateProjectsOrder(updated)
  draggedCategoryIndex.value = null
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <router-link to="/" class="sidebar-brand">
        <img src="/done.png" alt="Done Logo" class="app-logo" />
        <h1 class="app-title">{{ t('common.appName') }}</h1>
      </router-link>
    </div>

    <nav class="sidebar-nav">
      <button class="nav-item" :class="{ active: isActive('/') && !route.query.category }" @click="router.push('/')">
        <Home :size="20" />
        <span>{{ t('tasks.filters.all') }}</span>
      </button>

      <button class="nav-item" :class="{ active: route.query.filter === 'starred' }"
        @click="router.push({ path: '/', query: { filter: 'starred' } })">
        <Star :size="20" />
        <span>{{ t('tasks.filters.starred') }}</span>
      </button>

      <button class="nav-item" :class="{ active: isActive('/stats') }" @click="router.push('/stats')">
        <BarChart :size="20" />
        <span>{{ t('common.insights') }}</span>
      </button>

      <button class="nav-item" @click="showImportModal = true">
        <FileJson :size="20" />
        <span>{{ t('common.importTasks') }}</span>
      </button>

      <div class="projects-section">
        <div class="section-header">
          <h2>{{ t('modal.project') }}</h2>
          <button @click="showProjectDetailModal = true; selectedProjectId = null" class="add-cat-btn">
            <Plus :size="16" />
          </button>
        </div>

        <div class="project-item">
          <button class="nav-item project-link" :class="{ active: isCategoryActive('__none__') }"
            @click="handleCategoryClick('__none__')">
            <div class="color-dot none"></div>
            <span class="project-title">{{ t('tasks.categories.none') }}</span>
          </button>
        </div>

        <div v-for="(project, index) in todoStore.projectsWithStats" :key="project.id" class="project-item"
          draggable="true" @dragstart="handleDragStart(index)" @dragover="handleDragOver" @drop="handleDrop(index)"
          :class="{ dragging: draggedCategoryIndex === index }">

          <button class="nav-item project-link" :class="{ active: isCategoryActive(project.id) }"
            @click="handleCategoryClick(project.id)">
            <!-- Icon / Dot -->
            <div class="project-icon-wrapper">
              <div class="color-dot" :style="{ backgroundColor: project.color || '#ccc' }"></div>
            </div>

            <div class="project-info">
              <span class="project-title">{{ project.title }}</span>
              <div v-if="project.showProgress" class="project-progress">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill"
                    :style="{ width: project.progress + '%', backgroundColor: project.color }"></div>
                </div>
                <span class="progress-text">{{ project.progress }}%</span>
              </div>
            </div>

            <div class="actions">
              <button @click.stop="openProjectModal(project.id)" class="action-btn">
                <Edit2 :size="12" />
              </button>
              <button @click.stop="deleteProject(project.id)" class="action-btn delete">
                <Trash2 :size="12" />
              </button>
            </div>
          </button>
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="nav-item" :class="{ active: isActive('/settings') }" @click="router.push('/settings')">
        <Settings :size="20" />
        <span>{{ t('settings.title') }}</span>
      </button>
    </div>

    <ConfirmationModal :isOpen="showDeleteCategoryConfirm" :title="t('modal.deleteProject')"
      :message="t('modal.deleteProjectConfirm')" :confirmText="t('common.delete')" :cancelText="t('common.cancel')"
      type="danger" @confirm="confirmDeleteCategory" @cancel="showDeleteCategoryConfirm = false" />

    <ImportModal :isOpen="showImportModal" @close="showImportModal = false" @import="showImportModal = false" />

    <ProjectDetailModal :isOpen="showProjectDetailModal" :projectId="selectedProjectId || ''"
      @close="showProjectDetailModal = false; selectedProjectId = null" />
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: var(--color-bg-white);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.dark .sidebar {
  background: var(--color-bg-card);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  transition: opacity var(--transition-base);
}

.logo-link:hover {
  opacity: 0.8;
}

.app-logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.app-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-primary);
  margin: 0;
}

.sidebar-nav {
  flex: 1;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
  text-align: left;
}

.nav-item:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
  transform: translateX(4px);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.dark .nav-item.active {
  background: rgba(99, 102, 241, 0.2);
  color: var(--color-primary);
}

.sidebar-footer {
  padding: 1.5rem 1rem;
  border-top: 1px solid var(--color-border);
}

.projects-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  margin-bottom: 0.5rem;
}

.section-header h2 {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 800;
  letter-spacing: 0.1em;
}

.add-cat-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.add-cat-btn:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.project-item.dragging {
  opacity: 0.5;
}

.project-item {
  cursor: grab;
}

.project-item:active {
  cursor: grabbing;
}

.project-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  align-items: flex-start;
}

.project-link {
  justify-content: space-between;
}

.project-link .project-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  width: 100%;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.nav-item:hover .actions {
  opacity: 1;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
}

.action-btn.delete:hover {
  color: #ef4444;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--color-bg-white);
  color: var(--color-text-primary);
}

.dark .edit-input {
  background: var(--color-bg-lighter);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.icon-btn:hover {
  background: var(--color-bg-lavender);
}

.icon-btn.success {
  color: var(--color-success, #10b981);
}

.color-dot.none {
  background: #ccc;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
