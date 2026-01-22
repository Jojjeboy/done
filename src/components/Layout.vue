<script setup lang="ts">
defineOptions({ name: 'LayoutWrapper' })
</script>

<template>
  <div class="layout-wrapper">
    <slot />
  </div>
</template>

<style scoped>
.layout-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
