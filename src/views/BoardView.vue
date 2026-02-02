<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import type { TodoItem, Project } from '@/types/todo'
import KanbanColumn from '@/components/board/KanbanColumn.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import { ChevronDown } from 'lucide-vue-next'

const route = useRoute()
const todoStore = useTodoStore()
const { t } = useI18n()

// Layout State
const isDesktop = ref(window.innerWidth > 768)
const handleResize = () => {
  isDesktop.value = window.innerWidth > 768
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
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
  projectId: string | null // null for Uncategorized
  isOpen: boolean
  isPinned: boolean
}

// We map Projects -> Swimlanes
const swimlanes = ref<Swimlane[]>([])

// State for Move Confirmation
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

function getProjectName(id: string | null) {
  if (!id) return t('tasks.categories.none')
  return todoStore.projectsById.get(id)?.title || t('modal.project')
}

// Sync Logic
function syncSwimlanes() {
  const allTasks = todoStore.todoItems
  let projectsToShow: Project[] = []

  if (projectId.value) {
    // Single Project View
    if (projectId.value === '__none__') {
      // Only Uncategorized
      projectsToShow = [] // Special handling below
    } else {
      const p = todoStore.projectsById.get(projectId.value)
      if (p) projectsToShow = [p]
    }
  } else {
    // All Projects View
    projectsToShow = [...todoStore.projects].sort((a, b) => {
      // Pinned first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return a.order - b.order
    })
  }

  // Preserve existing open states if re-syncing
  const existingStates = new Map<string, boolean>()
  swimlanes.value.forEach(l => existingStates.set(l.id, l.isOpen))

  // Helper to init swimlane
  const createSwimlane = (id: string, title: string, color?: string, pid: string | null = null, isPinned: boolean = false) => ({
    id,
    title,
    color,
    projectId: pid,
    isPinned,
    pending: [] as TodoItem[],
    inProgress: [] as TodoItem[],
    completed: [] as TodoItem[],
    isOpen: true // Default to true, logic below will handle auto-collapse
  })

  // Build map
  const laneMap = new Map<string, Swimlane>()

  // Create lanes for projects
  projectsToShow.forEach(p => {
    laneMap.set(p.id, createSwimlane(p.id, p.title, p.color, p.id, p.isPinned))
  })

  // Create Uncategorized lane if needed (always needed if showing all, or if filtered to none)
  const showUncategorized = !projectId.value || projectId.value === '__none__'
  if (showUncategorized) {
    laneMap.set('__none__', createSwimlane('__none__', t('tasks.categories.none'), undefined, null))
  }

  // Distribute tasks
  allTasks.forEach(task => {
    // Filter by global search
    if (todoStore.searchQuery) {
      if (!task.title.toLowerCase().includes(todoStore.searchQuery.toLowerCase())) return
    }

    const pId = task.categoryId || '__none__'

    // If we are filtering by specific project, skip tasks not in it
    if (projectId.value && projectId.value !== pId) return

    const lane = laneMap.get(pId)
    if (lane) {
      if (task.status === 'pending') lane.pending.push(task)
      else if (task.status === 'in-progress') lane.inProgress.push(task)
      else if (task.status === 'completed') lane.completed.push(task)
    }
  })

  // Final swimlane list with Sorting & Auto-collapse logic

  // 1. Map to array
  const tempLanes: Swimlane[] = []
  projectsToShow.forEach(p => {
    const l = laneMap.get(p.id)
    if (l) tempLanes.push(l)
  })
  if (showUncategorized && laneMap.has('__none__')) {
    tempLanes.push(laneMap.get('__none__')!)
  }

  // 2. Adjust Open state & Final Sort
  // "Auto collapse projects that hasn't any tasks in them and put them at the bottom."
  tempLanes.forEach(lane => {
    const totalTasks = lane.pending.length + lane.inProgress.length + lane.completed.length

    // If it was already manually toggled, preserve that? Or auto-collapse empty ones always?
    // User said "Auto collapse projects that hasn't any tasks in them".
    // Let's force close if empty, otherwise use existing state or default to open.
    if (totalTasks === 0) {
      lane.isOpen = false
    } else {
      lane.isOpen = existingStates.has(lane.id) ? existingStates.get(lane.id)! : true
    }
  })

  // Sort: Pinned First, then Non-Empty, then Empty
  tempLanes.sort((a, b) => {
    // Pinned always top
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1

    const aTasks = a.pending.length + a.inProgress.length + a.completed.length
    const bTasks = b.pending.length + b.inProgress.length + b.completed.length

    // Active (has tasks) before Empty
    if (aTasks > 0 && bTasks === 0) return -1
    if (aTasks === 0 && bTasks > 0) return 1

    return 0 // Keep relative project order
  })

  swimlanes.value = tempLanes
}

function toggleSwimlane(lane: Swimlane) {
  lane.isOpen = !lane.isOpen
}

async function togglePin(lane: Swimlane) {
  if (!lane.projectId) return
  try {
    const newPinned = !lane.isPinned
    await todoStore.updateProject(lane.projectId, { isPinned: newPinned })
  } catch (e) {
    console.error("Failed to toggle pin", e)
  }
}

// Watchers
watch(() => todoStore.todoItems, syncSwimlanes, { deep: true })
watch(projectId, syncSwimlanes)
watch(() => todoStore.searchQuery, syncSwimlanes)
watch(() => todoStore.projects, syncSwimlanes, { deep: true })

onMounted(async () => {
  if (!todoStore.initialized) {
    await todoStore.initialize()
  }
  syncSwimlanes()
})

// Drag Handler
function onTaskChange(event: { added?: { element: TodoItem } }, newStatus: TodoItem['status'], targetProjectId: string | null) {
  if (event.added) {
    const task = event.added.element
    const currentProjectId = task.categoryId || null // Treat undefined as null

    // Check if moving to a different project
    // Note: targetProjectId comes from the swimlane rendering logic.
    // If targetProjectId is null (Uncategorized) and task.categoryId is undefined/null, they are equal.
    const normalizedTarget = targetProjectId === '__none__' ? null : targetProjectId
    const normalizedCurrent = currentProjectId

    if (normalizedCurrent !== normalizedTarget) {
      // Trigger Confirmation
      pendingMove.value = {
        task,
        newStatus,
        targetProjectId: normalizedTarget
      }
      showMoveConfirm.value = true
      // Note: The UI already reflects the move because vuedraggable moved the element in the local array.
      // If user cancels, we must force-refresh.
    } else {
      // Same project, just update status
      todoStore.updateTodoItem(task.id, {
        status: newStatus,
        updatedAt: Date.now()
      })
    }
  }
}

async function confirmMove() {
  if (pendingMove.value) {
    const { task, newStatus, targetProjectId } = pendingMove.value
    await todoStore.updateTodoItem(task.id, {
      status: newStatus,
      categoryId: targetProjectId,
      updatedAt: Date.now()
    })
  }
  showMoveConfirm.value = false
  pendingMove.value = null
}

function cancelMove() {
  showMoveConfirm.value = false
  pendingMove.value = null
  syncSwimlanes() // Revert UI (re-fetches from store state which hasn't changed project yet)
}

// Quick Add Handler
function onQuickAdd(status?: TodoItem['status']) {
  console.log('Quick add requested', status)
}


// Pre-open sections initially if desired?
// Let's default to open. Or just map specific logic.
// A simpler way: checking existence in a Set means "Closed" or "Open"?
// Let's say Set contains CLOSED sections.
const closedMobileSections = ref<Set<string>>(new Set())

function isSectionOpen(laneId: string, status: string) {
  return !closedMobileSections.value.has(`${laneId}-${status}`)
}

function toggleMobileSection(laneId: string, status: string) {
  const key = `${laneId}-${status}`
  if (closedMobileSections.value.has(key)) {
    closedMobileSections.value.delete(key)
  } else {
    closedMobileSections.value.add(key)
  }
}
</script>

<template>
  <div class="app-layout">
    <div class="desktop-sidebar">
      <AppSidebar />
    </div>

    <main v-if="isDesktop || !route.params.id" class="main-content">
      <div class="board-view">
        <div class="board-toolbar">
          <div class="toolbar-left">
            <h2 class="view-title">{{ projectTitle }}</h2>
          </div>
        </div>

        <!-- Swimlanes Container -->
        <div class="kanban-swimlanes">
          <div v-for="lane in swimlanes" :key="lane.id" class="swimlane">
            <!-- Swimlane Header (Only if showing all projects) -->
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

            <!-- Collapsible Content Wrapper -->
            <div v-show="lane.isOpen || projectId">
              <!-- Desktop Columns -->
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

              <!-- Mobile Accordions -->
              <div class="mobile-board">
                <!-- If showing all projects, repeat swimlane header inside mobile too -->
                <div v-if="!projectId" class="mobile-swimlane-header" @click="toggleSwimlane(lane)">
                  <div class="lane-title-group">
                    <ChevronDown class="collapse-icon" :class="{ 'rotate-180': !lane.isOpen }" :size="20" />
                    <div class="lane-dot" :style="{ backgroundColor: lane.color || '#ccc' }"></div>
                    <h3>{{ lane.title }}</h3>
                    <span class="lane-count">{{ lane.pending.length + lane.inProgress.length + lane.completed.length
                    }}</span>
                  </div>
                  <div class="lane-actions">
                    <button v-if="lane.projectId" class="pin-btn" :class="{ 'is-pinned': lane.isPinned }"
                      @click.stop="togglePin(lane)">
                      <Pin v-if="!lane.isPinned" :size="16" />
                      <PinOff v-else :size="16" />
                    </button>
                  </div>
                </div>

                <div v-if="lane.isOpen || projectId">
                  <!-- Pending -->
                  <div class="accordion-section">
                    <div class="accordion-header bg-blue-50/50 dark:bg-blue-900/10"
                      @click="toggleMobileSection(lane.id, 'pending')">
                      <span class="acc-title">{{ t('tasks.status.pending') }} ({{ lane.pending.length }})</span>
                      <ChevronDown :class="{ 'rotate-180': !isSectionOpen(lane.id, 'pending') }"
                        class="transition-transform" :size="20" />
                    </div>
                    <div v-show="isSectionOpen(lane.id, 'pending')" class="accordion-content">
                      <KanbanColumn title="" status="pending" :tasks="lane.pending" :projects="todoStore.projectsById"
                        @update:tasks="lane.pending = $event" @change="onTaskChange($event, 'pending', lane.projectId)"
                        class="mobile-column-override" />
                    </div>
                  </div>

                  <!-- In Progress -->
                  <div class="accordion-section">
                    <div class="accordion-header bg-orange-50/50 dark:bg-orange-900/10"
                      @click="toggleMobileSection(lane.id, 'inProgress')">
                      <span class="acc-title">{{ t('tasks.status.inProgress') }} ({{ lane.inProgress.length }})</span>
                      <ChevronDown :class="{ 'rotate-180': !isSectionOpen(lane.id, 'inProgress') }"
                        class="transition-transform" :size="20" />
                    </div>
                    <div v-show="isSectionOpen(lane.id, 'inProgress')" class="accordion-content">
                      <KanbanColumn title="" status="in-progress" :tasks="lane.inProgress"
                        :projects="todoStore.projectsById" @update:tasks="lane.inProgress = $event"
                        @change="onTaskChange($event, 'in-progress', lane.projectId)" class="mobile-column-override" />
                    </div>
                  </div>

                  <!-- Completed -->
                  <div class="accordion-section">
                    <div class="accordion-header bg-green-50/50 dark:bg-green-900/10"
                      @click="toggleMobileSection(lane.id, 'completed')">
                      <span class="acc-title">{{ t('tasks.status.completed') }} ({{ lane.completed.length }})</span>
                      <ChevronDown :class="{ 'rotate-180': !isSectionOpen(lane.id, 'completed') }"
                        class="transition-transform" :size="20" />
                    </div>
                    <div v-show="isSectionOpen(lane.id, 'completed')" class="accordion-content">
                      <KanbanColumn title="" status="completed" :tasks="lane.completed"
                        :projects="todoStore.projectsById" @update:tasks="lane.completed = $event"
                        @change="onTaskChange($event, 'completed', lane.projectId)" class="mobile-column-override" />
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

    <!-- Confirmation Modal for Move -->
    <ConfirmationModal :isOpen="showMoveConfirm" :title="t('modal.moveTask')"
      :message="t('modal.confirmMoveProject', { project: getProjectName(pendingMove?.targetProjectId || null) })"
      :confirmText="pendingMove?.task ? t('common.move') : 'Move'" :cancelText="t('common.cancel')"
      @confirm="confirmMove" @cancel="cancelMove" />
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
  width: var(--sidebar-width, 280px);
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
  width: var(--detail-panel-width, 450px);
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

  .desktop-sidebar {
    display: none;
  }

  .main-content {
    height: calc(100vh - 60px);
  }

  .mobile-only {
    display: block;
  }
}

/* Board specific styles */
.board-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
}

.board-toolbar {
  padding: var(--spacing-sm) var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.view-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.kanban-swimlanes {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: var(--spacing-xl);
}

.swimlane {
  margin-bottom: var(--spacing-md);
  background: rgba(0, 0, 0, 0.01);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.dark .swimlane {
  background: rgba(255, 255, 255, 0.01);
}

.swimlane-header {
  padding: var(--spacing-md) var(--spacing-xl);
  background: transparent;
  /* border-bottom: 1px solid var(--color-border-light); */
  /* Removed */
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: sticky;
  top: 0;
  z-index: 10;
}

.dark .swimlane-header {
  background: transparent;
  /* border-color: var(--color-border); */
  /* Removed */
}

.swimlane-header:hover {
  background: rgba(0, 0, 0, 0.03);
}

.dark .swimlane-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.lane-title-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.lane-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  /* box-shadow: 0 0 0 2px var(--color-bg-white), 0 0 0 4px rgba(0, 0, 0, 0.05); */
  /* Removed */
}

.dark .lane-dot {
  /* box-shadow: 0 0 0 2px var(--color-bg-card), 0 0 0 4px rgba(255, 255, 255, 0.05); */
  /* Removed */
}

.swimlane-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.lane-count {
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 24px;
  text-align: center;
}

.dark .lane-count {
  background: rgba(255, 255, 255, 0.1);
}

.lane-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.pin-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.pin-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-primary);
}

.dark .pin-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.pin-btn.is-pinned {
  color: var(--color-primary);
}

.collapse-icon {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-muted);
}

.kanban-container.desktop-board {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-xl) var(--spacing-xl);
  align-items: stretch;
  /* Stretch columns */
  min-height: 200px;
}

/* Mobile Styles */
.mobile-board {
  display: none;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.mobile-swimlane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  border: 1px solid var(--color-border-light);
}

.dark .mobile-swimlane-header {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.accordion-section {
  margin-bottom: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.accordion-header {
  padding: var(--spacing-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
}

.mobile-column-override {
  background: transparent;
  padding: var(--spacing-sm);
}

.mobile-column-override :deep(.column-header) {
  display: none;
}

@media (max-width: 768px) {
  .desktop-board {
    display: none;
  }

  .mobile-board {
    display: flex;
  }

  .board-toolbar {
    padding: var(--spacing-md);
  }
}
</style>
