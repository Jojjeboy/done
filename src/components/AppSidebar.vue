<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useRouter, useRoute } from 'vue-router'
import {
  Home,
  Settings,
  Plus,
  Edit2,
  Star,
  Pin,
  PinOff,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { Project } from '@/types/todo'
import ImportModal from '@/components/ImportModal.vue'
import ProjectDetailModal from '@/components/ProjectDetailModal.vue'

const todoStore = useTodoStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

// State
const showImportModal = ref(false)
const showProjectDetailModal = ref(false)
const selectedProjectId = ref<string | null>(null)
const draggedCategoryIndex = ref<number | null>(null)
const isCollapsed = ref(false)

// Responsive collapse behavior
const handleResize = () => {
  if (window.innerWidth < 1225) {
    isCollapsed.value = true
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize() // Check initial size
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Computed
const sortedProjects = computed(() => {
  return [...todoStore.projectsWithStats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return a.order - b.order
  })
})

const isActive = (path: string) => route.path === path
const isCategoryActive = (id: string) => {
  // Always board mode now
  return route.params.projectId === id
}

// Actions
const handleCategoryClick = (categoryId: string) => {
  // Board mode only
  if (isCategoryActive(categoryId)) {
    router.push('/')
  } else {
    router.push(`/board/${categoryId}`)
  }
}

const openProjectModal = (id: string) => {
  selectedProjectId.value = id
  showProjectDetailModal.value = true
}

const togglePin = async (project: Project) => {
  try {
    await todoStore.updateProject(project.id, { isPinned: !project.isPinned })
  } catch (e) {
    console.error("Failed to toggle pin in sidebar", e)
  }
}

// Drag and Drop
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

  const list = [...sortedProjects.value]
  const [removed] = list.splice(draggedCategoryIndex.value, 1)
  if (!removed) return
  list.splice(targetIndex, 0, removed)

  // Update order property globally
  const updated = list.map((cat, idx) => ({
    ...cat,
    order: idx
  }))

  await todoStore.updateProjectsOrder(updated)
  draggedCategoryIndex.value = null
}

// Toggle sidebar collapse
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <router-link to="/" class="sidebar-brand">
        <img src="/done.png" alt="Done Logo" class="app-logo" />
        <h1 class="app-title">{{ t('common.appName') }}</h1>
      </router-link>
      <button class="collapse-toggle" @click="toggleCollapse"
        :title="isCollapsed ? t('common.expand') || 'Expand' : t('common.collapse') || 'Collapse'">
        <PanelLeftOpen v-if="isCollapsed" :size="20" />
        <PanelLeftClose v-else :size="20" />
      </button>
    </div>

    <nav class="sidebar-nav">
      <button class="nav-item" :class="{ active: route.path === '/' && !route.params.projectId }"
        @click="router.push('/')">
        <Home :size="20" />
        <span>{{ t('tasks.filters.all') }}</span>
      </button>

      <button class="nav-item" :class="{ active: route.query.filter === 'starred' }"
        @click="router.push({ path: route.path, query: { ...route.query, filter: 'starred' } })">
        <Star :size="20" />
        <span>{{ t('tasks.filters.starred') }}</span>
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

        <div v-for="(project, index) in sortedProjects" :key="project.id" class="project-item" draggable="true"
          @dragstart="handleDragStart(index)" @dragover="handleDragOver" @drop="handleDrop(index)"
          :class="{ dragging: draggedCategoryIndex === index, 'is-pinned': project.isPinned }"
          :style="{ borderLeft: '3px solid ' + (project.color || '#ccc') }">

          <div class="project-link-row">
            <button class="nav-item project-link" :class="{ active: isCategoryActive(project.id) }"
              @click="handleCategoryClick(project.id)">
              <!-- Icon / Dot -->
              <div class="project-icon-wrapper">
                <div class="color-dot" :style="{ backgroundColor: project.color || '#ccc' }"></div>
              </div>

              <div class="project-info">
                <span class="project-title">{{ project.title }}</span>
                <div v-if="project.showProgress" class="project-progress">
                  <div class="progress-bar">
                    <div class="progress-fill"
                      :style="{ width: project.progress + '%', backgroundColor: project.color }"></div>
                  </div>
                  <span class="progress-text">{{ project.progress }}%</span>
                </div>
              </div>
            </button>

            <button class="pin-toggle-btn" @click.stop="togglePin(project)"
              :title="project.isPinned ? t('common.unpin') : t('common.pin')">
              <Pin v-if="!project.isPinned" :size="14" />
              <PinOff v-else :size="14" />
            </button>
            <div class="actions">
              <button @click.stop="openProjectModal(project.id)" class="action-btn">
                <Edit2 :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="nav-item" :class="{ active: isActive('/settings') }" @click="router.push('/settings')">
        <Settings :size="20" />
        <span>{{ t('settings.title') }}</span>
      </button>
    </div>

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
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar.collapsed .app-title,
.sidebar.collapsed .nav-item span,
.sidebar.collapsed .section-header h2,
.sidebar.collapsed .add-cat-btn,
.sidebar.collapsed .actions,
.sidebar.collapsed .pin-toggle-btn,
.sidebar.collapsed .project-progress,
.sidebar.collapsed .lane-count {
  display: none;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0.75rem;
}

.sidebar.collapsed .project-link {
  justify-content: center;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

.sidebar.collapsed .sidebar-brand {
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar.collapsed .color-dot {
  margin: 0;
}

/* Keep icon sizes at 20px even when collapsed */

.dark .sidebar {
  background: var(--color-bg-card);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.collapse-toggle {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.collapse-toggle:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.sidebar.collapsed .collapse-toggle {
  margin-top: 0.5rem;
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

.project-link:hover {
  background: transparent;
  transform: none;
}

.project-link:hover .project-title {
  font-weight: 600;
}

.nav-item.active {
  background: var(--color-border-light);
  color: var(--color-text-primary);
  font-weight: 600;
}

.dark .nav-item.active {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-primary);
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
  padding-left: 6px;
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

.project-link-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.project-link-row .project-link {
  flex: 1;
}

.pin-toggle-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-item:hover .pin-toggle-btn,
.project-item.is-pinned .pin-toggle-btn {
  opacity: 1;
}

.pin-toggle-btn:hover {
  background: var(--color-bg-lighter);
  color: var(--color-text-primary);
}

.project-item.is-pinned .project-title {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 1;
  transition: opacity 0.2s;
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
