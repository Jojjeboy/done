<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import type { TodoItem, Project } from '@/types/todo'
import KanbanColumn from '@/components/board/KanbanColumn.vue'
import TaskCard from '@/components/board/TaskCard.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import draggable from 'vuedraggable'
import { ChevronDown, Plus, Pin, PinOff } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const todoStore = useTodoStore()
const { t } = useI18n()

// Layout & Initialization State
const isDesktop = ref(window.innerWidth > 768)
const loading = computed(() => todoStore.loading)
const initialized = computed(() => todoStore.initialized)

const handleResize = () => {
  isDesktop.value = window.innerWidth > 768
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  if (!todoStore.initialized) {
    await todoStore.initialize()
  }
  syncSwimlanes()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const projectId = computed(() => route.params.projectId as string | undefined)

// Swimlane Data Structure
interface Swimlane {
  id: string
  title: string
  color?: string
  pending: TodoItem[]
  inProgress: TodoItem[]
  completed: TodoItem[]
  projectId: string | null
  isOpen: boolean
  isPinned: boolean
}

const swimlanes = ref<Swimlane[]>([])

// Move tasks logic
const showMoveConfirm = ref(false)
const pendingMove = ref<{
  task: TodoItem
  newStatus: TodoItem['status']
  targetProjectId: string | null
} | null>(null)

const projectTitle = computed(() => {
  if (!projectId.value) return t('common.allProjects')
  if (projectId.value === '__none__') return t('tasks.categories.none')
  return todoStore.projectsById.get(projectId.value)?.title || t('common.project')
})

function syncSwimlanes() {
  const allTasks = todoStore.todoItems
  let projectsToShow: Project[] = []

  if (projectId.value) {
    if (projectId.value !== '__none__') {
      const p = todoStore.projectsById.get(projectId.value)
      if (p) projectsToShow = [p]
    }
  } else {
    projectsToShow = [...todoStore.projects].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return a.order - b.order
    })
  }

  const existingStates = new Map<string, boolean>()
  swimlanes.value.forEach(l => existingStates.set(l.id, l.isOpen))

  const createSwimlane = (id: string, title: string, color?: string, pid: string | null = null, isPinned: boolean = false) => ({
    id, title, color, projectId: pid, isPinned,
    pending: [] as TodoItem[], inProgress: [] as TodoItem[], completed: [] as TodoItem[],
    isOpen: true
  })

  const laneMap = new Map<string, Swimlane>()
  projectsToShow.forEach(p => {
    laneMap.set(p.id, createSwimlane(p.id, p.title, p.color, p.id, p.isPinned))
  })

  const showUncategorized = !projectId.value || projectId.value === '__none__'
  if (showUncategorized) {
    laneMap.set('__none__', createSwimlane('__none__', t('tasks.categories.none'), undefined, null))
  }

  allTasks.forEach(task => {
    if (todoStore.searchQuery && !task.title.toLowerCase().includes(todoStore.searchQuery.toLowerCase())) return
    const pId = task.categoryId || '__none__'
    if (projectId.value && projectId.value !== pId) return
    const lane = laneMap.get(pId)
    if (lane) {
      if (task.status === 'pending') lane.pending.push(task)
      else if (task.status === 'in-progress') lane.inProgress.push(task)
      else if (task.status === 'completed') lane.completed.push(task)
    }
  })

  const tempLanes: Swimlane[] = []
  projectsToShow.forEach(p => {
    const l = laneMap.get(p.id)
    if (l) tempLanes.push(l)
  })
  if (showUncategorized && laneMap.has('__none__')) tempLanes.push(laneMap.get('__none__')!)

  tempLanes.forEach(lane => {
    const totalTasks = lane.pending.length + lane.inProgress.length + lane.completed.length
    if (totalTasks === 0) lane.isOpen = false
    else lane.isOpen = existingStates.has(lane.id) ? existingStates.get(lane.id)! : true
  })

  tempLanes.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    const aTasks = a.pending.length + a.inProgress.length + a.completed.length
    const bTasks = b.pending.length + b.inProgress.length + b.completed.length
    if (aTasks > 0 && bTasks === 0) return -1
    if (aTasks === 0 && bTasks > 0) return 1
    return 0
  })

  swimlanes.value = tempLanes
}

function toggleSwimlane(lane: Swimlane) {
  lane.isOpen = !lane.isOpen
}

async function togglePin(lane: Swimlane) {
  if (!lane.projectId) return
  try {
    await todoStore.updateProject(lane.projectId, { isPinned: !lane.isPinned })
  } catch (e) {
    console.error("Failed to toggle pin", e)
  }
}

watch(() => todoStore.todoItems, syncSwimlanes, { deep: true })
watch(projectId, syncSwimlanes)
watch(() => todoStore.searchQuery, syncSwimlanes)
watch(() => todoStore.projects, syncSwimlanes, { deep: true })

function onTaskChange(event: { added?: { element: TodoItem } }, newStatus: TodoItem['status'], targetProjectId: string | null) {
  if (event.added) {
    const task = event.added.element
    const normalizedTarget = targetProjectId === '__none__' ? null : targetProjectId
    const currentProjectId = task.categoryId || null
    if (currentProjectId !== normalizedTarget) {
      pendingMove.value = { task, newStatus, targetProjectId: normalizedTarget }
      showMoveConfirm.value = true
    } else {
      todoStore.updateTodoItem(task.id, { status: newStatus, updatedAt: Date.now() })
    }
  }
}

async function confirmMove() {
  if (pendingMove.value) {
    const { task, newStatus, targetProjectId } = pendingMove.value
    await todoStore.updateTodoItem(task.id, { status: newStatus, categoryId: targetProjectId, updatedAt: Date.now() })
  }
  showMoveConfirm.value = false
  pendingMove.value = null
}

function cancelMove() {
  showMoveConfirm.value = false
  pendingMove.value = null
  syncSwimlanes()
}

function onQuickAdd(status?: TodoItem['status'], targetProjectId?: string | null) {
  const pId = targetProjectId === '__none__' ? null : targetProjectId
  const query: Record<string, string> = {}
  if (status) query.status = status
  if (pId) query.category = pId
  router.push({ path: '/task/new', query })
}

const closedMobileSections = ref<Set<string>>(new Set())
function isSectionOpen(laneId: string, status: string) {
  return !closedMobileSections.value.has(`${laneId}-${status}`)
}
function toggleMobileSection(laneId: string, status: string) {
  const key = `${laneId}-${status}`
  if (closedMobileSections.value.has(key)) closedMobileSections.value.delete(key)
  else closedMobileSections.value.add(key)
}

function hexToRgb(hex: string) {
  if (!hex || hex.length < 7) return '156, 163, 175'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return isNaN(r) ? '156, 163, 175' : `${r}, ${g}, ${b}`
}
</script>

<template>
  <div class="app-layout">
    <div class="desktop-sidebar">
      <AppSidebar />
    </div>

    <main v-if="isDesktop || !route.params.id" class="main-content">
      <div v-if="loading && !initialized" class="loading">
        <div class="spinner"></div>
      </div>

      <div v-else class="board-view">
        <div class="board-toolbar">
          <div class="toolbar-left">
            <h2 class="view-title">{{ projectTitle }}</h2>
          </div>
        </div>

        <div class="kanban-swimlanes">
          <div v-for="lane in swimlanes" :key="lane.id" class="swimlane"
            :style="{ '--lane-color-rgb': hexToRgb(lane.color || '#9ca3af') }">

            <div v-if="!projectId" class="swimlane-header" @click="toggleSwimlane(lane)">
              <div class="lane-title-group">
                <ChevronDown class="collapse-icon" :class="{ 'rotate-180': !lane.isOpen }" :size="18" />
                <div class="lane-dot" :style="{ backgroundColor: lane.color || '#ccc' }"></div>
                <h3>{{ lane.title }}</h3>
                <span class="lane-count">{{ lane.pending.length + lane.inProgress.length + lane.completed.length
                }}</span>
              </div>
              <div class="lane-actions">
                <button v-if="lane.projectId" class="pin-btn" :class="{ 'is-pinned': lane.isPinned }"
                  @click.stop="togglePin(lane)" :title="lane.isPinned ? t('common.unpin') : t('common.pin')">
                  <Pin v-if="!lane.isPinned" :size="16" />
                  <PinOff v-else :size="16" />
                </button>
              </div>
            </div>

            <div v-show="lane.isOpen || projectId">
              <div class="kanban-container desktop-board">
                <KanbanColumn :title="t('tasks.status.pending')" status="pending" :tasks="lane.pending"
                  :projects="todoStore.projectsById" @update:tasks="lane.pending = $event"
                  @change="onTaskChange($event, 'pending', lane.projectId)" @add-task="onQuickAdd" />
                <KanbanColumn :title="t('tasks.status.inProgress')" status="in-progress" :tasks="lane.inProgress"
                  :projects="todoStore.projectsById" @update:tasks="lane.inProgress = $event"
                  @change="onTaskChange($event, 'in-progress', lane.projectId)" @add-task="onQuickAdd" />
                <KanbanColumn :title="t('tasks.status.completed')" status="completed" :tasks="lane.completed"
                  :projects="todoStore.projectsById" @update:tasks="lane.completed = $event"
                  @change="onTaskChange($event, 'completed', lane.projectId)" @add-task="onQuickAdd" />
              </div>

              <div class="mobile-board">
                <div v-if="!projectId" class="mobile-swimlane-header" @click="toggleSwimlane(lane)">
                  <div class="lane-title-group">
                    <ChevronDown class="collapse-icon" :class="{ 'rotate-180': !lane.isOpen }" :size="20" />
                    <div class="lane-dot" :style="{ backgroundColor: lane.color || '#ccc' }"></div>
                    <h3>{{ lane.title }}</h3>
                    <span class="lane-count">{{ lane.pending.length + lane.inProgress.length + lane.completed.length
                    }}</span>
                  </div>
                </div>
                <div v-show="lane.isOpen || projectId" class="mobile-columns">
                  <div class="mobile-column">
                    <div class="mobile-column-header" @click="toggleMobileSection(lane.id, 'pending')">
                      <ChevronDown :class="{ 'rotate-180': !isSectionOpen(lane.id, 'pending') }" :size="16" />
                      <span>{{ t('tasks.status.pending') }} ({{ lane.pending.length }})</span>
                    </div>
                    <div v-show="isSectionOpen(lane.id, 'pending')" class="mobile-task-list">
                      <draggable :list="lane.pending" item-key="id" group="tasks" class="drag-area"
                        @change="onTaskChange($event, 'pending', lane.projectId)">
                        <template #item="{ element }">
                          <TaskCard :task="element" :projects="todoStore.projectsById" />
                        </template>
                      </draggable>
                      <button class="quick-add-mobile" @click="onQuickAdd('pending', lane.projectId)">
                        <Plus :size="16" />
                        <span>{{ t('tasks.addTask') }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="mobile-column">
                    <div class="mobile-column-header" @click="toggleMobileSection(lane.id, 'inProgress')">
                      <ChevronDown :class="{ 'rotate-180': !isSectionOpen(lane.id, 'inProgress') }" :size="16" />
                      <span>{{ t('tasks.status.inProgress') }} ({{ lane.inProgress.length }})</span>
                    </div>
                    <div v-show="isSectionOpen(lane.id, 'inProgress')" class="mobile-task-list">
                      <draggable :list="lane.inProgress" item-key="id" group="tasks" class="drag-area"
                        @change="onTaskChange($event, 'in-progress', lane.projectId)">
                        <template #item="{ element }">
                          <TaskCard :task="element" :projects="todoStore.projectsById" />
                        </template>
                      </draggable>
                      <button class="quick-add-mobile" @click="onQuickAdd('in-progress', lane.projectId)">
                        <Plus :size="16" />
                        <span>{{ t('tasks.addTask') }}</span>
                      </button>
                    </div>
                  </div>
                  <div class="mobile-column">
                    <div class="mobile-column-header" @click="toggleMobileSection(lane.id, 'completed')">
                      <ChevronDown :class="{ 'rotate-180': !isSectionOpen(lane.id, 'completed') }" :size="16" />
                      <span>{{ t('tasks.status.completed') }} ({{ lane.completed.length }})</span>
                    </div>
                    <div v-show="isSectionOpen(lane.id, 'completed')" class="mobile-task-list">
                      <draggable :list="lane.completed" item-key="id" group="tasks" class="drag-area"
                        @change="onTaskChange($event, 'completed', lane.projectId)">
                        <template #item="{ element }">
                          <TaskCard :task="element" :projects="todoStore.projectsById" />
                        </template>
                      </draggable>
                      <button class="quick-add-mobile" @click="onQuickAdd('completed', lane.projectId)">
                        <Plus :size="16" />
                        <span>{{ t('tasks.addTask') }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div :class="{ 'desktop-detail-panel': isDesktop, 'mobile-detail-page': !isDesktop }" v-if="route.params.id">
      <RouterView />
    </div>

    <BottomNavigation class="mobile-only" v-if="!isDesktop && !route.params.id" @openAddTask="onQuickAdd" />

    <ConfirmationModal :isOpen="showMoveConfirm" :title="t('modal.moveTask')"
      :message="t('modal.confirmMoveProject', { project: todoStore.projectsById.get(pendingMove?.targetProjectId || '')?.title || t('tasks.categories.none') })"
      :confirmText="t('common.move')" :cancelText="t('common.cancel')" @confirm="confirmMove" @cancel="cancelMove" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.desktop-sidebar {
  flex-shrink: 0;
  width: 280px;
  border-right: 1px solid var(--color-border);
  display: none;
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.desktop-detail-panel {
  flex-shrink: 0;
  width: 450px;
  border-left: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  overflow-y: auto;
  display: none;
}

.mobile-detail-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-primary);
  z-index: 1000;
  overflow-y: auto;
}

.mobile-only {
  display: none;
}

@media (min-width: 769px) {

  .desktop-sidebar,
  .desktop-detail-panel {
    display: block;
  }
}

@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }

  .main-content {
    height: calc(100vh - 60px);
  }

  .mobile-only {
    display: block;
  }
}

.board-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow-y: auto;
}

.board-toolbar {
  margin-bottom: 2rem;
}

.view-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.kanban-swimlanes {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.swimlane {
  background-color: rgba(var(--lane-color-rgb), 0.04);
  padding: var(--spacing-xl);
  border-radius: var(--radius-xxl);
  margin-bottom: var(--spacing-xxl);
  border: 1px solid rgba(var(--lane-color-rgb), 0.08);
  transition: all 0.3s ease;
}

.dark .swimlane {
  background-color: rgba(var(--lane-color-rgb), 0.08);
  border-color: rgba(var(--lane-color-rgb), 0.15);
}

.swimlane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  cursor: pointer;
  background: rgba(var(--lane-color-rgb), 0.08);
  border-radius: var(--radius-lg);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(8px);
}

.dark .swimlane-header {
  background: rgba(var(--lane-color-rgb), 0.15);
}

.lane-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-icon {
  transition: transform 0.3s;
}

.rotate-180 {
  transform: rotate(-180deg);
}

.lane-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.swimlane-header h3 {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.lane-count {
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-bg-lighter);
  padding: 2px 8px;
  border-radius: 100px;
}

.kanban-container.desktop-board {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.loading {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-bg-lighter);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.mobile-board {
  display: none;
}

@media (max-width: 1024px) {
  .kanban-container.desktop-board {
    display: none;
  }

  .mobile-board {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-swimlane-header {
    display: flex;
    align-items: center;
    padding: 12px;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .mobile-columns {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-left: 12px;
  }

  .mobile-column {
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    background: var(--color-bg-white);
    overflow: hidden;
  }

  .mobile-column-header {
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    cursor: pointer;
    background: var(--color-bg-lighter);
  }

  .mobile-task-list {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .quick-add-mobile {
    width: 100%;
    padding: 8px;
    border: 1px dashed var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }
}

@media (min-width: 1301px) {
  .desktop-detail-panel {
    width: 600px;
  }
}

.pin-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.pin-btn.is-pinned {
  color: var(--color-primary);
  background: rgba(var(--lane-color-rgb), 0.1);
}
</style>
