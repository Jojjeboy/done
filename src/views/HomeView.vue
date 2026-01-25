<script setup lang="ts">
import { ref } from 'vue'
import MobileHeader from '@/components/MobileHeader.vue'
import TaskListView from '@/components/TaskListView.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import SearchModal from '@/components/SearchModal.vue'
import AddTaskModal from '@/components/AddTaskModal.vue'

const showSearchModal = ref(false)
const showAddTaskModal = ref(false)
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
        <TaskListView />
      </div>

      <!-- Mobile Bottom Nav -->
      <div class="mobile-only">
        <BottomNavigation
          @open-search="showSearchModal = true"
          @open-add-task="showAddTaskModal = true"
        />
      </div>
    </main>

    <!-- Modals -->
    <SearchModal v-if="showSearchModal" @close="showSearchModal = false" />
    <AddTaskModal v-if="showAddTaskModal" @close="showAddTaskModal = false" />

    <!-- Desktop Add Task FAB -->
     <button class="desktop-fab" @click="showAddTaskModal = true">
        <span class="plus-icon">+</span>
     </button>
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
</style>
