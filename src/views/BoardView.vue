```
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import type { TodoItem } from '@/types/todo'
import KanbanColumn from '@/components/board/KanbanColumn.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
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

// Local state for columns (synced with store)
const pendingTasks = ref<TodoItem[]>([])
const inProgressTasks = ref<TodoItem[]>([])
const completedTasks = ref<TodoItem[]>([])

const projectId = computed(() => route.params.projectId as string | undefined)

// Initialize & Sync Logic
const filteredSourceTasks = computed(() => {
  let tasks = todoStore.todoItems

  if (projectId.value) {
    if (projectId.value === '__none__') {
       tasks = tasks.filter(t => !t.categoryId)
    } else {
       tasks = tasks.filter(t => t.categoryId === projectId.value)
    }
  }

  if (todoStore.searchQuery) {
    const q = todoStore.searchQuery.toLowerCase()
    tasks = tasks.filter(t => t.title.toLowerCase().includes(q))
  }

  return tasks
})

function syncLocalState() {
  const source = filteredSourceTasks.value
  // We prefer replacing the arrays completely to ensure valid state
  // But for smoother reordering we might want to preserve order if possible?
  // For now, simple filtering is safest.
  pendingTasks.value = source.filter(t => t.status === 'pending')
  inProgressTasks.value = source.filter(t => t.status === 'in-progress')
  completedTasks.value = source.filter(t => t.status === 'completed')

  // Sort by priority/date within columns?
  // Current list logic sorts by deadline helpers.
  // We'll leave them as is (insertion order) or apply a default sort.
}

// Watch for store changes
watch(() => todoStore.todoItems, syncLocalState, { deep: true })
watch(projectId, syncLocalState)
watch(() => todoStore.searchQuery, syncLocalState)

onMounted(async () => {
    if (!todoStore.initialized) {
        await todoStore.initialize()
    }
    syncLocalState()
})

// Drag & Drop Handlers
function onTaskChange(event: { added?: { element: TodoItem } }, newStatus: TodoItem['status']) {
  // event contains { added, removed, moved }
  if (event.added) {
    const task = event.added.element
    // Update status in store
    todoStore.updateTodoItem(task.id, {
        status: newStatus,
        updatedAt: Date.now()
    })
  }
  // We don't need to handle 'removed' because the 'added' handler in the target column handles the logic
  // We don't need to handle 'moved' (reorder) as we aren't persisting order yet
}

// Quick Add Handler
function onQuickAdd(status?: TodoItem['status']) {
    // Placeholder for future implementation
    console.log('Quick add requested for status:', status)
}

// Filter Logic
const projectTitle = computed(() => {
    if (!projectId.value) return t('common.allProjects')
    if (projectId.value === '__none__') return t('tasks.categories.none')
    return todoStore.projectsById.get(projectId.value)?.title || t('common.project')
})

// Mobile Accordion State
const openAccordions = ref({
    pending: true,
    inProgress: true,
    completed: true
})

function toggleAccordion(key: 'pending' | 'inProgress' | 'completed') {
    openAccordions.value[key] = !openAccordions.value[key]
}
</script>

<template>
  <div class="app-layout">
    <!-- Desktop Sidebar -->
    <div class="desktop-sidebar">
      <AppSidebar />
    </div>

    <!-- Main Content Area -->
    <main v-if="isDesktop || !route.params.id" class="main-content">
        <div class="board-view">
            <!-- Header / Toolbar -->
            <div class="board-toolbar">
            <div class="toolbar-left">
                <h2 class="view-title">{{ projectTitle }}</h2>
            </div>

            <div class="toolbar-right">
                <!-- Placeholder for future filters -->
            </div>
            </div>

            <!-- Desktop: Horizontal Columns -->
            <div class="kanban-container desktop-board">
            <KanbanColumn
                :title="t('tasks.status.pending')"
                status="pending"
                :tasks="pendingTasks"
                :projects="todoStore.projectsById"
                @update:tasks="pendingTasks = $event"
                @change="onTaskChange($event, 'pending')"
                @add-task="onQuickAdd"
            />

            <KanbanColumn
                :title="t('tasks.status.in_progress')"
                status="in-progress"
                :tasks="inProgressTasks"
                :projects="todoStore.projectsById"
                @update:tasks="inProgressTasks = $event"
                @change="onTaskChange($event, 'in-progress')"
                @add-task="onQuickAdd"
            />

            <KanbanColumn
                :title="t('tasks.status.completed')"
                status="completed"
                :tasks="completedTasks"
                :projects="todoStore.projectsById"
                @update:tasks="completedTasks = $event"
                @change="onTaskChange($event, 'completed')"
                @add-task="onQuickAdd"
            />
            </div>

            <!-- Mobile: Accordion / Vertical Stack -->
            <div class="mobile-board">
                <!-- Pending -->
                <div class="accordion-section">
                    <div class="accordion-header bg-blue-50/50 dark:bg-blue-900/10" @click="toggleAccordion('pending')">
                        <span class="acc-title">{{ t('tasks.status.pending') }} ({{ pendingTasks.length }})</span>
                        <ChevronDown :class="{ 'rotate-180': !openAccordions.pending }" class="transition-transform" :size="20"/>
                    </div>
                    <div v-show="openAccordions.pending" class="accordion-content">
                        <KanbanColumn
                            title=""
                            status="pending"
                            :tasks="pendingTasks"
                            :projects="todoStore.projectsById"
                            @update:tasks="pendingTasks = $event"
                            @change="onTaskChange($event, 'pending')"
                            class="mobile-column-override"
                        />
                    </div>
                </div>

                <!-- In Progress -->
                <div class="accordion-section">
                    <div class="accordion-header bg-orange-50/50 dark:bg-orange-900/10" @click="toggleAccordion('inProgress')">
                        <span class="acc-title">{{ t('tasks.status.in_progress') }} ({{ inProgressTasks.length }})</span>
                        <ChevronDown :class="{ 'rotate-180': !openAccordions.inProgress }" class="transition-transform" :size="20"/>
                    </div>
                    <div v-show="openAccordions.inProgress" class="accordion-content">
                        <KanbanColumn
                            title=""
                            status="in-progress"
                            :tasks="inProgressTasks"
                            :projects="todoStore.projectsById"
                            @update:tasks="inProgressTasks = $event"
                            @change="onTaskChange($event, 'in-progress')"
                            class="mobile-column-override"
                        />
                    </div>
                </div>

                <!-- Completed -->
                <div class="accordion-section">
                    <div class="accordion-header bg-green-50/50 dark:bg-green-900/10" @click="toggleAccordion('completed')">
                        <span class="acc-title">{{ t('tasks.status.completed') }} ({{ completedTasks.length }})</span>
                        <ChevronDown :class="{ 'rotate-180': !openAccordions.completed }" class="transition-transform" :size="20"/>
                    </div>
                    <div v-show="openAccordions.completed" class="accordion-content">
                        <KanbanColumn
                            title=""
                            status="completed"
                            :tasks="completedTasks"
                            :projects="todoStore.projectsById"
                            @update:tasks="completedTasks = $event"
                            @change="onTaskChange($event, 'completed')"
                            class="mobile-column-override"
                        />
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Task Detail View (Right Panel) -->
    <div :class="{ 'desktop-detail-panel': isDesktop, 'mobile-detail-page': !isDesktop }"
      v-if="isDesktop || route.params.id">
      <RouterView />
    </div>

    <!-- Mobile Bottom Nav -->
    <BottomNavigation class="mobile-only" v-if="!isDesktop && !route.params.id" @openAddTask="onQuickAdd" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh; /* Full viewport height */
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.desktop-sidebar {
  flex-shrink: 0;
  width: var(--sidebar-width); /* Define in CSS variables or config */
  border-right: 1px solid var(--color-border);
  display: none; /* Hidden by default, shown on desktop */
}

.main-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Allows internal scrolling for board-view */
}

.desktop-detail-panel {
  flex-shrink: 0;
  width: var(--detail-panel-width); /* Define in CSS variables or config */
  border-left: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  overflow-y: auto;
  display: none; /* Hidden by default, shown on desktop when active */
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
  display: none; /* Hidden by default, shown on mobile */
}

@media (min-width: 769px) {
  .desktop-sidebar {
    display: block;
  }
  .desktop-detail-panel {
    display: block;
  }
  .mobile-only {
    display: none !important;
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
    height: calc(100vh - var(--bottom-nav-height, 60px)); /* Adjust for mobile nav */
  }
  .mobile-only {
    display: block;
  }
}

.board-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-bg-primary);
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

/* Desktop Styles */
.desktop-board {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-xl);
    overflow-x: auto;
    flex: 1;
    align-items: flex-start; /* items stick to top */
}

/* Mobile Styles */
.mobile-board {
    display: none;
    flex-direction: column;
    padding: var(--spacing-sm);
    overflow-y: auto;
    flex: 1;
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
    background: var(--color-bg-tertiary);
    font-weight: 600;
}

.accordion-content {
    background: var(--color-bg-secondary);
    /* Remove padding to let column handle it */
}

/* Hide header in mobile columns since accordion handles it */
.mobile-column-override :deep(.column-header) {
    display: none;
}
.mobile-column-override {
    background: transparent;
    min-width: 0;
    padding: var(--spacing-sm);
}

/* Responsive Switch */
@media (max-width: 768px) {
    .desktop-board { display: none; }
    .mobile-board { display: flex; }
    .board-toolbar { padding: var(--spacing-md); }
}
</style>
