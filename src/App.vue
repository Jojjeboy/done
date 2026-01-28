<script setup lang="ts">
import { RouterView } from 'vue-router'
import ReloadPrompt from '@/components/ReloadPrompt.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
</script>

<template>
  <RouterView />
  <ReloadPrompt />
  <LoadingOverlay />
</template>
