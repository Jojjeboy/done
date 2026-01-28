<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TaskDetail from '@/components/TaskDetail.vue'

defineProps<{
  isEmbedded?: boolean
}>()

const route = useRoute()
const todoId = computed(() => route.params.id as string)
</script>

<template>
  <div class="detail-view-container">
    <div class="overlay"></div>
    <div class="card-modal">
      <TaskDetail :id="todoId" :is-embedded="isEmbedded" />
    </div>
  </div>
</template>

<style scoped>
.detail-view-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  justify-content: center;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: -1;
}

.card-modal {
  background: var(--color-bg-white);
  width: 100%;
  max-width: 700px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
}

@media (min-width: 769px) {
  .detail-view-container {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
  }

  .overlay {
    display: none;
  }

  .card-modal {
    max-width: 100%;
    height: 100%;
    margin-top: 0;
    border-radius: 0;
    box-shadow: none;
  }
}

.dark .card-modal {
  background: var(--color-bg-card);
}
</style>
