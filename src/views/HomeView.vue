<script setup lang="ts">
import { ref } from 'vue'
import MobileHeader from '@/components/MobileHeader.vue'
import DatePicker from '@/components/DatePicker.vue'
import TaskListView from '@/components/TaskListView.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'

const selectedDate = ref(new Date())
</script>

<template>
  <div class="mobile-app">
    <MobileHeader />
    <div class="app-content">
      <DatePicker v-model:selectedDate="selectedDate" />
      <TaskListView />
    </div>
    <BottomNavigation />
  </div>
</template>

<style scoped>
.mobile-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  max-width: 480px;
  margin: 0 auto;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
}

.dark .mobile-app {
  background-color: #1A1A1A;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 481px) {
  .mobile-app {
    border-radius: 12px;
    margin-top: 1rem;
    margin-bottom: 1rem;
    min-height: calc(100vh - 2rem);
  }
}
</style>
