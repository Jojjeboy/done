<script setup lang="ts">
import { Menu, Search, Plus } from 'lucide-vue-next'

const showMenu = () => {
  // TODO: Implement menu drawer
}

const showSearch = () => {
  // TODO: Implement search
}

const addTask = () => {
  // TODO: Implement add task modal
}
</script>

<template>
  <nav class="bottom-nav">
    <button @click="showMenu" class="nav-btn" aria-label="Menu">
      <Menu class="w-6 h-6" />
    </button>
    <button @click="showSearch" class="nav-btn" aria-label="Search">
      <Search class="w-6 h-6" />
    </button>
    <button @click="addTask" class="nav-btn-add" aria-label="Add task">
      <Plus class="w-6 h-6" />
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0.75rem 1rem;
  background-color: #ffffff;
  border-top: 1px solid #E5E7EB;
  z-index: 50;
}

.dark .bottom-nav {
  background-color: #1A1A1A;
  border-top-color: #374151;
}

.nav-btn {
  background: transparent;
  border: none;
  color: #6B7280;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.nav-btn:hover {
  color: #111827;
}

.dark .nav-btn:hover {
  color: #F9FAFB;
}

.nav-btn-add {
  background-color: #10B981;
  border: none;
  border-radius: 12px;
  color: #ffffff;
  cursor: pointer;
  padding: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: all 0.2s ease;
}

.nav-btn-add:hover {
  background-color: #059669;
  transform: scale(1.05);
}

.nav-btn-add:active {
  transform: scale(0.95);
}
</style>
