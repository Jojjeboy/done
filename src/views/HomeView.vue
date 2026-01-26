<script setup lang="ts">
import { ref } from 'vue'
import MobileHeader from '@/components/MobileHeader.vue'
import TaskListView from '@/components/TaskListView.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import SearchModal from '@/components/SearchModal.vue'
import TodoModal from '@/components/TodoModal.vue'
import { useRoute } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { computed } from 'vue'
import { Trash2, AlertTriangle } from 'lucide-vue-next'

const route = useRoute()
const todoStore = useTodoStore()
const showSearchModal = ref(false)
const showTodoModal = ref(false)
const editingTodoId = ref<string | null>(null)
const initialCategoryId = ref<string | null>(null)

const openAddTask = () => {
    editingTodoId.value = null
    initialCategoryId.value = route.query.category as string || null
    showTodoModal.value = true
}

const openEditTask = (taskId: string) => {
    editingTodoId.value = taskId
    showTodoModal.value = true
}

const handleModalClose = () => {
    showTodoModal.value = false
    editingTodoId.value = null
    initialCategoryId.value = null
}

const staleTasks = computed(() => {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
  return todoStore.todoItems.filter(t => t.status === 'pending' && t.updatedAt < thirtyDaysAgo)
})

import ConfirmationModal from '@/components/ConfirmationModal.vue'

// ... existing code ...
const showStaleConfirm = ref(false)

const cleanupStaleTasks = () => {
  showStaleConfirm.value = true
}

const confirmCleanup = async () => {
  try {
    for (const task of staleTasks.value) {
      await todoStore.deleteTodoItem(task.id)
    }
  } catch (error) {
      console.error(error)
  } finally {
    showStaleConfirm.value = false
  }
}
</script>

<template>
  <div class="app-layout">
    <!-- Desktop Sidebar -->
    <div class="desktop-sidebar">
      <AppSidebar />
    </div>

    <!-- Main Content Area -->
    <main class="main-content">
      <div class="mobile-only">
        <MobileHeader />
      </div>

      <div class="content-wrapper">
        <!-- Stale Task Banner -->
        <div v-if="staleTasks.length > 0" class="stale-banner">
          <div class="stale-content">
            <AlertTriangle :size="20" class="stale-icon" />
            <span>You have {{ staleTasks.length }} tasks untouched for 30 days. Clean up?</span>
          </div>
          <button @click="cleanupStaleTasks" class="cleanup-btn">
            <Trash2 :size="16" />
            <span>Clean</span>
          </button>
        </div>

        <TaskListView @edit-task="openEditTask" />
      </div>

      <!-- Mobile Bottom Nav -->
      <div class="mobile-only">
        <BottomNavigation
          @open-search="showSearchModal = true"
          @open-add-task="openAddTask"
        />
      </div>
    </main>

    <!-- Modals -->
    <SearchModal
      v-if="showSearchModal"
      @close="showSearchModal = false"
      @edit-task="(id) => { showSearchModal = false; openEditTask(id); }"
    />
    <TodoModal
      v-if="showTodoModal"
      :todo-id="editingTodoId"
      :initial-category-id="initialCategoryId"
      @close="handleModalClose"
    />

    <!-- Desktop Add Task FAB -->
     <button class="desktop-fab" @click="openAddTask">
        <span class="plus-icon">+</span>
     </button>

     <ConfirmationModal
        :isOpen="showStaleConfirm"
        title="Clean up Stale Tasks"
        :message="`Are you sure you want to delete ${staleTasks.length} tasks that haven't been touched in 30 days?`"
        confirmText="Clean Up"
        type="neutral"
        @confirm="confirmCleanup"
        @cancel="showStaleConfirm = false"
     />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-lighter);
}

.dark .app-layout {
  background: var(--color-bg-light);
}

.desktop-sidebar {
  display: none;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.mobile-only {
  display: block;
}

.desktop-fab {
    display: none;
}

@media (min-width: 769px) {
  .desktop-sidebar {
    display: block;
    flex-shrink: 0;
  }

  .mobile-only {
    display: none;
  }

  .content-wrapper {
      padding: var(--spacing-2xl);
  }

  .desktop-fab {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      bottom: 2rem;
      right: 2rem;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: var(--color-primary);
      color: white;
      border: none;
      box-shadow: var(--shadow-lg);
      cursor: pointer;
      z-index: 10;
      transition: transform 0.2s;
  }

  .plus-icon {
      font-size: 2rem;
      line-height: 1;
      margin-top: -4px;
  }

  .desktop-fab:hover {
      transform: scale(1.1);
  }
}

.stale-banner {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid #F59E0B;
  border-radius: var(--radius-md);
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #D97706;
}

.dark .stale-banner {
  background: rgba(245, 158, 11, 0.05);
  border-color: rgba(245, 158, 11, 0.3);
  color: #F59E0B;
}

.stale-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-weight: 500;
  font-size: var(--font-size-sm);
}

.cleanup-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: #F59E0B;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  font-size: var(--font-size-xs);
  transition: all 0.2s;
}

.cleanup-btn:hover {
  background: #D97706;
}
</style>
