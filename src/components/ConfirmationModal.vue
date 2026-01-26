<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { AlertTriangle, X } from 'lucide-vue-next'

defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'neutral'
  singleButton?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="emit('cancel')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-icon" :class="type || 'neutral'">
          <AlertTriangle :size="24" />
        </div>
        <button class="close-btn" @click="emit('cancel')">
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <h3 class="modal-title">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
      </div>

      <div class="modal-actions">
        <button v-if="!singleButton" class="btn-cancel" @click="emit('cancel')">
          {{ cancelText || t('common.cancel') }}
        </button>
        <button class="btn-confirm" :class="type || 'neutral'" @click="emit('confirm')">
          {{ confirmText || t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: var(--color-bg-white);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  width: 90%;
  max-width: 400px;
  box-shadow: var(--shadow-xl);
  animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .modal-content {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon.danger {
  background: #FEE2E2;
  color: #EF4444;
}

.header-icon.neutral {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--spacing-sm);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
}

.close-btn:hover {
  background: var(--color-bg-light);
  color: var(--color-text-primary);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm);
}

.modal-message {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-2xl);
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.btn-cancel:hover {
  background: var(--color-bg-light);
}

.btn-confirm.danger {
  background: #EF4444;
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.btn-confirm.danger:hover {
  background: #DC2626;
}

.btn-confirm.neutral {
  background: var(--color-primary);
  color: white;
  border: none;
  box-shadow: var(--shadow-purple);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
