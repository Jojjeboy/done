<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTodoStore, COLOR_PALETTE, DEFAULT_COLOR } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { X, Check, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
    isOpen: boolean
    projectId: string | null
}>()

const emit = defineEmits(['close', 'delete'])

const todoStore = useTodoStore()
const { t } = useI18n()

// Local State
const title = ref('')
const description = ref('')
const color = ref(DEFAULT_COLOR)
const showProgress = ref(true)
const isPinned = ref(false)
const deadline = ref('')

const isSaving = ref(false)

const loadProject = () => {
    if (!props.projectId) {
        // Reset for new project
        title.value = ''
        description.value = ''
        color.value = COLOR_PALETTE[0] || DEFAULT_COLOR
        showProgress.value = true
        isPinned.value = false
        deadline.value = ''
        return
    }

    const project = todoStore.projects.find(p => p.id === props.projectId)
    if (project) {
        title.value = project.title
        description.value = project.description || ''
        color.value = project.color || DEFAULT_COLOR
        showProgress.value = project.showProgress ?? true
        isPinned.value = project.isPinned ?? false
        if (project.deadline && typeof project.deadline === 'number') {
            deadline.value = new Date(project.deadline).toISOString().split('T')[0]!
        } else {
            deadline.value = ''
        }
    }
}

watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        loadProject()
    }
})

const handleSave = async () => {
    isSaving.value = true
    try {
        const payload = {
            title: title.value.trim(),
            description: description.value.trim(),
            color: color.value,
            showProgress: showProgress.value,
            isPinned: isPinned.value,
            deadline: deadline.value ? new Date(deadline.value).getTime() : null
        }

        if (props.projectId) {
            await todoStore.updateProject(props.projectId, payload)
        } else {
            await todoStore.addProject(
                payload.title,
                payload.color,
                undefined, // icon
                payload.description,
                payload.deadline,
                payload.showProgress,
                payload.isPinned
            )
        }
        emit('close')
    } catch (e) {
        console.error("Failed to save project", e)
    } finally {
        isSaving.value = false
    }
}

const handleDelete = () => {
    if (props.projectId && confirm(t('modal.deleteProjectConfirm'))) {
        todoStore.deleteProject(props.projectId)
        emit('close')
    }
}

const colors = COLOR_PALETTE
</script>

<template>
    <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-content">
            <div class="modal-header">
                <h2>{{ t('modal.projectDetails') }}</h2>
                <button class="close-btn" @click="emit('close')">
                    <X :size="20" />
                </button>
            </div>

            <div class="modal-body">
                <!-- Title -->
                <div class="form-group">
                    <label>{{ t('modal.projectTitle') }}</label>
                    <input v-model="title" class="input-field" :placeholder="t('modal.projectTitlePlaceholder')" />
                </div>

                <!-- Description -->
                <div class="form-group">
                    <label>{{ t('modal.projectDescription') }}</label>
                    <textarea v-model="description" class="textarea-field"
                        :placeholder="t('modal.projectDescriptionPlaceholder')" rows="3"></textarea>
                </div>

                <!-- Color Picker -->
                <div class="form-group">
                    <label>{{ t('modal.color') }}</label>
                    <div class="color-grid">
                        <button v-for="c in colors" :key="c" class="color-btn" :style="{ backgroundColor: c }"
                            :class="{ selected: color === c }" @click="color = c">
                            <Check v-if="color === c" :size="12" class="check-icon" />
                        </button>
                    </div>
                </div>

                <!-- Deadline -->
                <div class="form-group">
                    <label>{{ t('modal.deadline') }}</label>
                    <input type="date" v-model="deadline" class="input-field" />
                </div>

                <!-- Show Progress Toggle -->
                <div class="form-row toggle-row">
                    <span>{{ t('modal.showProgress') }}</span>
                    <button class="toggle-switch" :class="{ active: showProgress }"
                        @click="showProgress = !showProgress">
                        <div class="toggle-thumb"></div>
                    </button>
                </div>

                <!-- Pinned Toggle -->
                <div class="form-row toggle-row">
                    <span>{{ t('modal.pinned') }}</span>
                    <button class="toggle-switch" :class="{ active: isPinned }" @click="isPinned = !isPinned">
                        <div class="toggle-thumb"></div>
                    </button>
                </div>
            </div>

            <div class="modal-footer">
                <button v-if="projectId" class="btn btn-danger" @click="handleDelete">
                    <Trash2 :size="16" />
                    {{ t('common.delete') }}
                </button>
                <div class="footer-spacer"></div>
                <button class="btn btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
                <button class="btn btn-primary" @click="handleSave" :disabled="!title.trim() || isSaving">
                    {{ isSaving ? t('common.saving') : t('common.save') }}
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
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
}

.modal-content {
    background: var(--color-bg-white);
    border-radius: 12px;
    width: 100%;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.dark .modal-content {
    background: var(--color-bg-card);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
}

.close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
}

.modal-body {
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-secondary);
}

.input-field,
.textarea-field {
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg-lighter, #f9fafb);
    color: var(--color-text-primary);
    font-size: 0.95rem;
    width: 100%;
}

.dark .input-field,
.dark .textarea-field {
    background: rgba(255, 255, 255, 0.05);
}

.textarea-field {
    resize: vertical;
    min-height: 80px;
}

.color-grid {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.color-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.1s;
}

.color-btn:hover {
    transform: scale(1.1);
}

.color-btn.selected {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
}

.check-icon {
    color: white;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

.form-row.toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.toggle-switch {
    width: 40px;
    height: 22px;
    background: var(--color-bg-muted, #ccc);
    border-radius: 20px;
    position: relative;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
}

.toggle-switch.active {
    background: var(--color-primary);
}

.toggle-thumb {
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.toggle-switch.active .toggle-thumb {
    transform: translateX(18px);
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.footer-spacer {
    flex: 1;
}

.btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    font-size: 0.9rem;
}

.btn-secondary {
    background: transparent;
    color: var(--color-text-secondary);
}

.btn-secondary:hover {
    background: var(--color-bg-lighter);
}

.btn-primary {
    background: var(--color-primary);
    color: white;
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-danger {
    background: #ef4444;
    color: white;
    display: flex;
    align-items: center;
    gap: 6px;
}

.btn-danger:hover {
    background: #dc2626;
}
</style>
