<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw, X } from 'lucide-vue-next'

const { t } = useI18n()

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

const close = () => {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    class="pwa-toast"
    role="alert"
  >
    <div class="message">
      <span v-if="offlineReady">
        {{ t('pwa.readyOffline') }}
      </span>
      <span v-else>
        {{ t('pwa.newContent') }}
      </span>
    </div>
    <div class="actions">
      <button v-if="needRefresh" @click="updateServiceWorker()" class="reload-btn">
        <RefreshCw :size="16" />
        <span>{{ t('pwa.reload') }}</span>
      </button>
      <button @click="close" class="close-btn">
        <X :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pwa-toast {
  position: fixed;
  right: 0;
  bottom: 0;
  margin: var(--spacing-lg);
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  z-index: 100;
  text-align: left;
  box-shadow: var(--shadow-lg);
  background-color: var(--color-bg-white);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dark .pwa-toast {
  background-color: var(--color-bg-card);
}

.message {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
}

.reload-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.close-btn {
  padding: var(--spacing-sm);
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
}
</style>
