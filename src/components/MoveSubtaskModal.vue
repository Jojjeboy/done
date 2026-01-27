<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { X, Search } from 'lucide-vue-next'

const props = defineProps<{
    isOpen: boolean
    currentTodoId: string
    subtaskTitle: string
}>()

const emit = defineEmits<{
    close: []
    move: [targetTodoId: string]
}>()

const todoStore = useTodoStore()
const { t } = useI18n()
const searchQuery = ref('')

const filteredTasks = computed(() => {
    const query = searchQuery.value.toLowerCase().trim()
    return todoStore.allItems
        .filter(item =>
            item.id !== props.currentTodoId &&
            item.title.toLowerCase().includes(query)
        )
        .sort((a, b) => b.updatedAt - a.updatedAt)
})

const handleMove = (targetTodoId: string) => {
    emit('move', targetTodoId)
}
</script>

<template>
    <div v-if="isOpen" class="move-modal-overlay" @click="emit('close')">
        <div class="move-modal-content" @click.stop>
            <div class="move-header">
                <h3 class="move-title">{{ t('modal.moveSubtask') }}</h3>
                <button @click="emit('close')" class="close-btn">
                    <X :size="20" />
                </button>
            </div>

            <div class="subtask-preview">
                <p class="preview-label">{{ t('modal.movingSubtask') }}:</p>
                <p class="preview-title">{{ subtaskTitle }}</p>
            </div>

            <div class="search-section">
                <div class="search-input-wrapper">
                    <Search :size="16" class="search-icon" />
                    <input v-model="searchQuery" type="text" :placeholder="t('search.placeholder')" class="search-input"
                        autofocus />
                </div>
            </div>

            <div class="tasks-list">
                <div v-if="filteredTasks.length === 0" class="no-results">
                    {{ t('search.noResults') }}
                </div>
                <button v-for="task in filteredTasks" :key="task.id" class="task-item" @click="handleMove(task.id)">
                    <div class="task-info">
                        <div class="task-line">
                            <span class="task-name">{{ task.title }}</span>
                            <span v-if="task.status === 'completed'" class="completed-badge">{{
                                t('tasks.filters.completed') }}</span>
                        </div>
                        <div v-if="task.categoryId" class="task-category-info">
                            <div class="color-dot"
                                :style="{ backgroundColor: todoStore.categoriesById.get(task.categoryId)?.color || '#ccc' }">
                            </div>
                            <span class="category-name">{{ todoStore.categoriesById.get(task.categoryId)?.title
                                }}</span>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.move-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: var(--spacing-md);
}

.move-modal-content {
    background: var(--color-bg-white);
    width: 100%;
    max-width: 450px;
    max-height: 80vh;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-2xl);
    animation: modalEnter 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .move-modal-content {
    background: var(--color-bg-card);
    border: 1px solid var(--color-border-light);
}

@keyframes modalEnter {
    from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.move-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--color-border-light);
}

.move-title {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 800;
}

.close-btn {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: var(--spacing-xs);
    border-radius: 50%;
    display: flex;
    transition: all 0.2s;
}

.close-btn:hover {
    background: var(--color-bg-lighter);
    color: var(--color-text-primary);
}

.subtask-preview {
    padding: var(--spacing-lg);
    background: var(--color-bg-lavender);
}

.dark .subtask-preview {
    background: rgba(255, 255, 255, 0.03);
}

.preview-label {
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    font-weight: 700;
    color: var(--color-text-muted);
    margin-bottom: 4px;
}

.preview-title {
    font-weight: 600;
    color: var(--color-text-primary);
}

.search-section {
    padding: var(--spacing-md) var(--spacing-lg);
}

.search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.search-icon {
    position: absolute;
    left: 12px;
    color: var(--color-text-muted);
}

.search-input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    border: 1px solid var(--color-border-light);
    border-radius: 8px;
    background: var(--color-bg-lighter);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    transition: all 0.2s;
}

.search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    background: var(--color-bg-white);
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.tasks-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-sm) var(--spacing-lg) var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.task-item {
    display: flex;
    align-items: center;
    padding: 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
}

.task-item:hover {
    background: var(--color-bg-lighter);
    border-color: var(--color-border-light);
}

.task-name {
    font-weight: 500;
    color: var(--color-text-primary);
}

.task-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
}

.task-line {
    display: flex;
    align-items: center;
}

.task-category-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--color-text-muted);
}

.task-category-info .color-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

.completed-badge {
    font-size: 10px;
    padding: 2px 6px;
    background: var(--color-status-completed);
    color: white;
    border-radius: 4px;
    margin-left: 8px;
    text-transform: uppercase;
    font-weight: 700;
}

.no-results {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
}
</style>
