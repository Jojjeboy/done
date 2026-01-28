<script setup lang="ts">
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { X, Check } from 'lucide-vue-next'

const props = defineProps<{
    isOpen: boolean
    activeFilter: string
    activeCategory: string | null
}>()

const emit = defineEmits<{
    close: []
    'update:filter': [filter: string]
    'update:category': [categoryId: string | null]
}>()

const todoStore = useTodoStore()
const { t } = useI18n()

// Filters config
const filters = ['all', 'todo', 'in-progress', 'completed', 'starred']

const selectFilter = (filter: string) => {
    emit('update:filter', filter)
}

const selectCategory = (categoryId: string | null) => {
    if (props.activeCategory === categoryId && categoryId !== null) {
        emit('update:category', null)
    } else {
        emit('update:category', categoryId)
    }
}
</script>

<template>
    <div v-if="isOpen" class="modal-overlay" @click="emit('close')">
        <div class="modal-content" @click.stop>
            <div class="modal-header">
                <h3 class="title">{{ t('common.viewOptions') }}</h3>
                <button class="close-btn" @click="emit('close')">
                    <X :size="20" />
                </button>
            </div>

            <div class="section">
                <label class="label">{{ t('tasks.statusTitle') }}</label>
                <div class="filter-options">
                    <button v-for="filter in filters" :key="filter" class="filter-chip"
                        :class="{ active: activeFilter === filter }" @click="selectFilter(filter)">
                        {{ t(`tasks.filters.${filter === 'in-progress' ? 'inProgress' : filter}`) }}
                        <Check v-if="activeFilter === filter" :size="14" />
                    </button>
                </div>
            </div>

            <div class="section">
                <label class="label">{{ t('modal.category') }}</label>
                <div class="category-grid">
                    <button class="category-card" :class="{ active: activeCategory === null }"
                        @click="selectCategory(null)">
                        <div class="dot" style="background-color: #9CA3AF"></div>
                        <span>{{ t('tasks.filters.all') }} {{ t('modal.category').toLowerCase() }}</span>
                    </button>
                    <button v-for="category in todoStore.categories" :key="category.id" class="category-card"
                        :class="{ active: activeCategory === category.id }" @click="selectCategory(category.id)">
                        <div class="dot" :style="{ backgroundColor: category.color }"></div>
                        <span>{{ category.title }}</span>
                    </button>
                </div>
            </div>

            <div class="footer">
                <button class="btn-full" @click="emit('close')">{{ t('common.close') }}</button>
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
    z-index: 100;
    display: flex;
    align-items: flex-end;
    /* Bottom sheet on mobile default */
}

.modal-content {
    background: var(--color-bg-white);
    width: 100%;
    border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
    padding: var(--spacing-xl);
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: var(--shadow-2xl);
}

@media (min-width: 768px) {
    .modal-overlay {
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        width: 400px;
        border-radius: var(--radius-xl);
        animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
}

.dark .modal-content {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-xl);
}

.title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
}

.close-btn {
    background: transparent;
    border: none;
    padding: var(--spacing-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-full);
}

.section {
    margin-bottom: var(--spacing-2xl);
}

.label {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-md);
}

.filter-options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.filter-chip {
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    transition: all var(--transition-base);
}

.filter-chip.active {
    background: var(--color-bg-lavender);
    color: var(--color-primary);
    border-color: var(--color-primary);
}

.category-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
}

.category-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: transparent;
    cursor: pointer;
    transition: all var(--transition-base);
}

.category-card span {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    font-weight: var(--font-weight-medium);
}

.category-card.active {
    background: var(--color-bg-purple-tint);
    border-color: var(--color-primary);
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.footer {
    display: flex;
    justify-content: stretch;
}

.btn-full {
    width: 100%;
    padding: var(--spacing-lg);
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }

    to {
        transform: translateY(0);
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
