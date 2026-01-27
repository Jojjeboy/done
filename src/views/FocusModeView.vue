<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, CheckCircle, Circle, List } from 'lucide-vue-next'

const router = useRouter()
const todoStore = useTodoStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()

// Filter tasks that are in focus mode
const focusTasks = computed(() => {
    return todoStore.todoItems.filter(task =>
        settingsStore.focusModeTaskIds.includes(task.id) && task.status !== 'completed'
    )
})

const completedFocusTasks = computed(() => {
    return todoStore.todoItems.filter(task =>
        settingsStore.focusModeTaskIds.includes(task.id) && task.status === 'completed'
    )
})

const progress = computed(() => {
    const total = settingsStore.focusModeTaskIds.length
    if (total === 0) return 0
    const completed = completedFocusTasks.value.length
    return Math.round((completed / total) * 100)
})

const exitFocusMode = () => {
    router.push('/')
}

onMounted(async () => {
    if (!todoStore.initialized) {
        await todoStore.initialize()
    }
    // If no tasks are selected, redirect back
    if (settingsStore.focusModeTaskIds.length === 0) {
        router.push('/')
    }
})
</script>

<template>
    <div class="focus-mode-view">
        <div class="focus-header">
            <button class="back-btn" @click="exitFocusMode" :title="t('focus.exit')">
                <ArrowLeft :size="24" />
            </button>
            <div class="focus-title">
                <h1>{{ t('focus.title') }}</h1>
                <span class="focus-subtitle" v-if="focusTasks.length > 0">
                    {{ focusTasks.length }} {{ t('tasks.filters.todo').toLowerCase() }}
                </span>
            </div>
            <div class="progress-ring">
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-bg-lighter)" stroke-width="4" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-primary)" stroke-width="4"
                        stroke-dasharray="100" :stroke-dashoffset="100 - progress" transform="rotate(-90 20 20)"
                        class="progress-circle" />
                </svg>
                <span class="progress-text">{{ progress }}%</span>
            </div>
        </div>

        <div class="focus-content">
            <div v-if="focusTasks.length === 0" class="celebration">
                <div class="celebration-icon">🎉</div>
                <h2>{{ t('common.allDone') }}</h2>
                <p>{{ t('focus.exit') }}</p>
                <button class="btn-primary" @click="exitFocusMode">{{ t('focus.exit') }}</button>
            </div>

            <div v-else class="task-list">
                <div v-for="task in focusTasks" :key="task.id" class="focus-task-card">
                    <button class="checkbox-btn" @click="todoStore.toggleTodoCompletion(task.id)">
                        <Circle :size="24" />
                    </button>

                    <div class="task-info">
                        <h3 class="task-title">{{ task.title }}</h3>
                        <p v-if="task.description" class="task-desc">{{ task.description }}</p>

                        <div class="subtasks-list" v-if="todoStore.subtasksByTodoId.get(task.id)?.length">
                            <div class="subtask-header">
                                <List :size="14" />
                                <span>Subtasks</span>
                            </div>
                            <div v-for="sub in todoStore.subtasksByTodoId.get(task.id)" :key="sub.id"
                                class="subtask-item">
                                <button class="sub-checkbox" @click="todoStore.toggleSubtask(sub.id)">
                                    <CheckCircle v-if="sub.completed" :size="14" class="checked" />
                                    <Circle v-else :size="14" />
                                </button>
                                <span :class="{ completed: sub.completed }">{{ sub.title }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.focus-mode-view {
    min-height: 100vh;
    background: var(--color-bg-white);
    display: flex;
    flex-direction: column;
}

.dark .focus-mode-view {
    background: var(--color-bg-light);
}

.focus-header {
    padding: var(--spacing-xl);
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    z-index: 10;
    border-bottom: 1px solid var(--color-border-light);
}

.dark .focus-header {
    background: rgba(26, 24, 53, 0.9);
}

.back-btn {
    background: none;
    border: none;
    color: var(--color-text-primary);
    cursor: pointer;
    padding: var(--spacing-sm);
    border-radius: var(--radius-full);
    transition: background 0.2s;
}

.back-btn:hover {
    background: var(--color-bg-lighter);
}

.focus-title {
    text-align: center;
}

.focus-title h1 {
    margin: 0;
    font-size: var(--font-size-xl);
}

.focus-subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
}

.progress-ring {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.progress-circle {
    transition: stroke-dashoffset 0.5s ease;
}

.progress-text {
    position: absolute;
    font-size: 10px;
    font-weight: bold;
}

.focus-content {
    flex: 1;
    padding: var(--spacing-xl);
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
}

.celebration {
    text-align: center;
    margin-top: var(--spacing-4xl);
}

.celebration-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing-lg);
}

.btn-primary {
    margin-top: var(--spacing-xl);
    background: var(--color-primary);
    color: white;
    border: none;
    padding: var(--spacing-md) var(--spacing-xl);
    border-radius: var(--radius-full);
    font-weight: bold;
    cursor: pointer;
}

.task-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
}

.focus-task-card {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--color-bg-lighter);
    /* Subtle card */
    border-radius: var(--radius-lg);
    /* border: 1px solid var(--color-border-light); */
    align-items: flex-start;
}

.dark .focus-task-card {
    background: var(--color-bg-card);
}

.checkbox-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    padding-top: 4px;
    /* Align with title */
}

.checkbox-btn:hover {
    color: var(--color-primary);
}

.task-info {
    flex: 1;
}

.task-title {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-lg);
    line-height: 1.4;
}

.task-desc {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    margin: 0 0 var(--spacing-md) 0;
}

.subtasks-list {
    margin-top: var(--spacing-md);
    padding-left: var(--spacing-sm);
    border-left: 2px solid var(--color-border-light);
}

.subtask-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    margin-bottom: var(--spacing-sm);
    text-transform: uppercase;
    font-weight: bold;
}

.subtask-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    font-size: var(--font-size-sm);
}

.sub-checkbox {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
}

.sub-checkbox .checked {
    color: var(--color-primary);
}

.subtask-item span.completed {
    text-decoration: line-through;
    color: var(--color-text-muted);
}
</style>
