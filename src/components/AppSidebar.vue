<script setup lang="ts">
import { ref } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useRouter, useRoute } from 'vue-router'
import {
  Home,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  BarChart,
  FileJson
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { Category } from '@/types/todo'
import ImportModal from '@/components/ImportModal.vue'

const todoStore = useTodoStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const showImportModal = ref(false)

const isEditingCategory = ref<string | null>(null)
const editingTitle = ref('')
const isAddingCategory = ref(false)
const newCategoryTitle = ref('')

const isActive = (path: string) => route.path === path
const isCategoryActive = (id: string) => route.query.category === id

const startEditing = (category: Category) => {
  isEditingCategory.value = category.id
  editingTitle.value = category.title
}

const saveCategory = async (id: string) => {
  if (editingTitle.value.trim()) {
    await todoStore.updateCategory(id, { title: editingTitle.value.trim() })
  }
  isEditingCategory.value = null
}

import ConfirmationModal from '@/components/ConfirmationModal.vue'

// ... existing code ...
const showDeleteCategoryConfirm = ref(false)
const categoryToDelete = ref<string | null>(null)

const deleteCategory = (id: string) => {
  categoryToDelete.value = id
  showDeleteCategoryConfirm.value = true
}

const confirmDeleteCategory = async () => {
  if (categoryToDelete.value) {
    await todoStore.deleteCategory(categoryToDelete.value)
    categoryToDelete.value = null
  }
  showDeleteCategoryConfirm.value = false
}

const addCategory = async () => {
  if (newCategoryTitle.value.trim()) {
    await todoStore.addCategory(newCategoryTitle.value.trim())
    newCategoryTitle.value = ''
    isAddingCategory.value = false
  }
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1 class="app-title">{{ t('common.appName') }}</h1>
    </div>

    <nav class="sidebar-nav">
      <button class="nav-item" :class="{ active: isActive('/') && !route.query.category }" @click="router.push('/')">
        <Home :size="20" />
        <span>{{ t('tasks.filters.all') }}</span>
      </button>

      <button class="nav-item" :class="{ active: isActive('/stats') }" @click="router.push('/stats')">
        <BarChart :size="20" />
        <span>{{ t('common.insights') }}</span>
      </button>

      <button class="nav-item" @click="showImportModal = true">
        <FileJson :size="20" />
        <span>{{ t('common.importTasks') }}</span>
      </button>

      <div class="categories-section">
        <div class="section-header">
          <h2>{{ t('modal.category') }}</h2>
          <button @click="isAddingCategory = true" class="add-cat-btn">
            <Plus :size="16" />
          </button>
        </div>

        <div v-if="isAddingCategory" class="edit-row">
          <input v-model="newCategoryTitle" class="edit-input" autofocus @keyup.enter="addCategory"
            @keyup.esc="isAddingCategory = false" />
          <button @click="addCategory" class="icon-btn success">
            <Check :size="14" />
          </button>
          <button @click="isAddingCategory = false" class="icon-btn">
            <X :size="14" />
          </button>
        </div>

        <div v-for="category in todoStore.categories" :key="category.id" class="category-item">
          <div v-if="isEditingCategory === category.id" class="edit-row">
            <input v-model="editingTitle" class="edit-input" autofocus @keyup.enter="saveCategory(category.id)"
              @keyup.esc="isEditingCategory = null" />
            <button @click="saveCategory(category.id)" class="icon-btn success">
              <Check :size="14" />
            </button>
            <button @click="isEditingCategory = null" class="icon-btn">
              <X :size="14" />
            </button>
          </div>
          <button v-else class="nav-item category-link" :class="{ active: isCategoryActive(category.id) }"
            @click="router.push({ path: '/', query: { category: category.id } })">
            <div class="color-dot" :style="{ backgroundColor: category.color || '#ccc' }"></div>
            <span class="category-title">{{ category.title }}</span>
            <div class="actions">
              <button @click.stop="startEditing(category)" class="action-btn">
                <Edit2 :size="12" />
              </button>
              <button @click.stop="deleteCategory(category.id)" class="action-btn delete">
                <Trash2 :size="12" />
              </button>
            </div>
          </button>
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      <button class="nav-item" :class="{ active: isActive('/settings') }" @click="router.push('/settings')">
        <Settings :size="20" />
        <span>{{ t('settings.title') }}</span>
      </button>
    </div>

    <ConfirmationModal :isOpen="showDeleteCategoryConfirm" :title="t('modal.deleteCategory')"
      :message="t('modal.deleteCategoryConfirm')" :confirmText="t('common.delete')" :cancelText="t('common.cancel')"
      type="danger" @confirm="confirmDeleteCategory" @cancel="showDeleteCategoryConfirm = false" />

    <ImportModal :isOpen="showImportModal" @close="showImportModal = false" @import="showImportModal = false" />
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: var(--color-bg-white);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.dark .sidebar {
  background: var(--color-bg-card);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.app-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-primary);
  margin: 0;
}

.sidebar-nav {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
  text-align: left;
}

.nav-item:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.nav-item.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

.dark .nav-item.active {
  background: rgba(99, 102, 241, 0.2);
  color: var(--color-primary);
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}

.categories-section {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  margin-bottom: 0.5rem;
}

.section-header h2 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.add-cat-btn {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.add-cat-btn:hover {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.category-link {
  justify-content: space-between;
}

.category-link .category-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.nav-item:hover .actions {
  opacity: 1;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
}

.action-btn.delete:hover {
  color: #ef4444;
}

.edit-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--color-bg-white);
  color: var(--color-text-primary);
}

.dark .edit-input {
  background: var(--color-bg-lighter);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.icon-btn:hover {
  background: var(--color-bg-lavender);
}

.icon-btn.success {
  color: var(--color-success, #10b981);
}
</style>
