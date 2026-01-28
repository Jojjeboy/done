<script setup lang="ts">
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'

const todoStore = useTodoStore()
const { t } = useI18n()
</script>

<template>
    <Transition name="fade">
        <div v-if="todoStore.globalLoading" class="loading-overlay">
            <div class="loading-content">
                <div class="spinner"></div>
                <p class="loading-text">{{ t('common.saving') || 'Saving...' }}</p>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-content {
    background: var(--color-bg-white);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    box-shadow: var(--shadow-2xl);
}

.dark .loading-content {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-light);
}

.spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-bg-lavender);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.loading-text {
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
