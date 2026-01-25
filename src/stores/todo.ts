import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'
import type { TodoItem, Subtask, Category } from '@/types/todo'

export const useTodoStore = defineStore('todo', () => {
  // State
  const todoItems = ref<TodoItem[]>([])
  const subtasks = ref<Subtask[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(true)
  const initialized = ref(false)

  // Computed
  const subtasksByTodoId = computed(() => {
    const map = new Map<string, Subtask[]>()
    subtasks.value.forEach((subtask) => {
      if (!map.has(subtask.todoId)) {
        map.set(subtask.todoId, [])
      }
      map.get(subtask.todoId)!.push(subtask)
    })
    return map
  })

  const allItems = computed(() => {
    return todoItems.value
  })

  const categoriesById = computed(() => {
    const map = new Map<string, Category>()
    categories.value.forEach((category) => {
      map.set(category.id, category)
    })
    return map
  })

  const categoriesSortedByActivity = computed(() => {
    const activityMap = new Map<string, { lastUpdated: number; pendingCount: number }>()

    // Initialize map
    categories.value.forEach((cat) => {
      activityMap.set(cat.id, { lastUpdated: 0, pendingCount: 0 })
    })

    // Calculate activity per category
    todoItems.value.forEach((item) => {
      if (item.categoryId && activityMap.has(item.categoryId)) {
        const stats = activityMap.get(item.categoryId)!
        stats.lastUpdated = Math.max(stats.lastUpdated, item.updatedAt)
        if (item.status !== 'completed') {
          stats.pendingCount++
        }
      }
    })

    return [...categories.value].sort((a, b) => {
      const statsA = activityMap.get(a.id)!
      const statsB = activityMap.get(b.id)!

      // Sort by last updated (descending)
      if (statsB.lastUpdated !== statsA.lastUpdated) {
        return statsB.lastUpdated - statsA.lastUpdated
      }

      // Then by pending count (descending)
      if (statsB.pendingCount !== statsA.pendingCount) {
        return statsB.pendingCount - statsA.pendingCount
      }

      // Fallback to title
      return a.title.localeCompare(b.title)
    })
  })

  // Helper function to generate IDs
  const generateId = (): string => {
    return crypto.randomUUID()
  }

  // Initialize store from IndexedDB
  const initialize = async () => {
    if (initialized.value) {
      return
    }

    try {
      loading.value = true
      const db = getDatabase()

      // Load all data from IndexedDB
      const [dbItems, dbSubtasks, dbCategories] = await Promise.all([
        db.table('todoItems').toArray(),
        db.table('subtasks').toArray(),
        db.table('categories').toArray(),
      ])

      let finalCategories = dbCategories
      const itemsToUpdate: TodoItem[] = []
      const categoriesToAdd: Category[] = []

      // Initialize default categories if none exist
      if (finalCategories.length === 0) {
        const defaults = [
          { id: generateId(), title: 'Work', color: '#ffbd2e', isDefault: true, createdAt: Date.now() },
          { id: generateId(), title: 'Lifestyle', color: '#ff5c5c', isDefault: true, createdAt: Date.now() },
          { id: generateId(), title: 'Personal', color: '#2ecc71', isDefault: true, createdAt: Date.now() },
          { id: generateId(), title: 'Hobby', color: '#3498db', isDefault: true, createdAt: Date.now() },
        ]
        categoriesToAdd.push(...defaults)
        finalCategories = [...defaults]
      }

      // Safe Access for mapping
      const getCategoryId = (oldCategory: string): string | null => {
        const titleMap: Record<string, string> = {
            'work': 'Work',
            'lifestyle': 'Lifestyle',
            'personal': 'Personal',
            'hobby': 'Hobby'
        }
        const targetTitle = titleMap[oldCategory]
        if (!targetTitle) return null
        return finalCategories.find(c => c.title === targetTitle)?.id || null
      }

      // Migrate items (handle both "category" string and missing "categoryId")
      const migratedItems: TodoItem[] = dbItems.map((item: unknown) => {
        let needsUpdate = false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newItem = { ...(item as any) }

        // Migration from string category to categoryId
        if ('category' in newItem && typeof newItem.category === 'string') {
          const newId = getCategoryId(newItem.category)
          newItem.categoryId = newId
          delete newItem.category
          needsUpdate = true
        } else if (!('categoryId' in newItem)) {
           // Ensure categoryId exists
           newItem.categoryId = null
           needsUpdate = true
        }

        if (needsUpdate) {
            itemsToUpdate.push(newItem as TodoItem)
        }

        return newItem as TodoItem
      })


      // Persist changes
      if (categoriesToAdd.length > 0) {
        await db.table('categories').bulkAdd(categoriesToAdd)
      }

      if (itemsToUpdate.length > 0) {
        await db.table('todoItems').bulkPut(itemsToUpdate)
      }

      todoItems.value = migratedItems
      subtasks.value = dbSubtasks
      categories.value = finalCategories

      initialized.value = true
    } catch (error) {
      console.error('Failed to initialize todo store:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Category CRUD
  const addCategory = async (title: string, color?: string, icon?: string) => {
      const category: Category = {
          id: generateId(),
          title,
          color,
          icon,
          createdAt: Date.now()
      }
      categories.value.push(category)
      try {
          await getDatabase().table('categories').add(category)
      } catch (e) {
          console.error('Failed to add category', e)
          categories.value = categories.value.filter(c => c.id !== category.id)
          throw e
      }
      return category
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const index = categories.value.findIndex((c) => c.id === id)
    if (index === -1) throw new Error('Category not found')

    const original = categories.value[index]!
    const updated: Category = { ...original, ...updates }
    categories.value[index] = updated

    try {
      await getDatabase().table('categories').update(id, updates)
    } catch (e) {
      console.error('Failed to update category', e)
      categories.value[index] = original
      throw e
    }
  }

  const deleteCategory = async (id: string) => {
      const index = categories.value.findIndex(c => c.id === id)
      if (index === -1) throw new Error('Category not found')

      categories.value.splice(index, 1)

      // Also update tasks to remove this category
      const tasksToUpdate = todoItems.value.filter(i => i.categoryId === id)
      tasksToUpdate.forEach(t => t.categoryId = null)

      try {
          const db = getDatabase()
          await db.transaction('rw', db.table('categories'), db.table('todoItems'), async () => {
              await db.table('categories').delete(id)
              await db.table('todoItems').bulkPut(tasksToUpdate.map(t => ({...t}))) // Persist the nullified categoryId
          })
      } catch (e) {
          console.error('Failed to delete category', e)
          throw e
      }
  }


  // TodoItem CRUD
  const addTodoItem = async (
    title: string,
    description: string = '',
    priority: TodoItem['priority'] = 'medium',
    deadline: number | null = null,
    categoryId: string | null = null
  ) => {
    const now = Date.now()
    const item: TodoItem = {
      id: generateId(),
      title,
      description,
      status: 'pending',
      priority,
      deadline,
      categoryId,
      createdAt: now,
      updatedAt: now,
    }

    todoItems.value.push(item)

    try {
      const db = getDatabase()
      await db.table('todoItems').add(item)
    } catch (error) {
      console.error('Failed to persist todo item:', error)
      const index = todoItems.value.findIndex((i) => i.id === item.id)
      if (index !== -1) {
        todoItems.value.splice(index, 1)
      }
      throw error
    }

    return item
  }

  const updateTodoItem = async (id: string, updates: Partial<TodoItem>) => {
    const index = todoItems.value.findIndex((i) => i.id === id)
    if (index === -1) {
      throw new Error(`TodoItem with id ${id} not found`)
    }

    const original = todoItems.value[index]!
    const updatedItem: TodoItem = {
      ...original,
      ...updates,
      updatedAt: Date.now(),
    } as TodoItem
    todoItems.value[index] = updatedItem

    try {
      const db = getDatabase()
      await db.table('todoItems').update(id, updatedItem)
    } catch (error) {
      console.error('Failed to update todo item:', error)
      todoItems.value[index] = original
      throw error
    }
  }

  const deleteTodoItem = async (id: string) => {
    const index = todoItems.value.findIndex((i) => i.id === id)
    if (index === -1) {
      throw new Error(`TodoItem with id ${id} not found`)
    }

    const itemSubtasks = subtasks.value.filter((subtask) => subtask.todoId === id)

    todoItems.value.splice(index, 1)
    subtasks.value = subtasks.value.filter((subtask) => subtask.todoId !== id)

    try {
      const db = getDatabase()
      await db.transaction('rw', db.table('todoItems'), db.table('subtasks'), async () => {
        await db.table('todoItems').delete(id)
        await db.table('subtasks').bulkDelete(itemSubtasks.map((s) => s.id))
      })
    } catch (error) {
      console.error('Failed to delete todo item:', error)
      throw error
    }
  }

  // Subtask CRUD
  const addSubtask = async (todoId: string, title: string) => {
    const subtask: Subtask = {
      id: generateId(),
      todoId,
      title,
      completed: false,
    }

    subtasks.value.push(subtask)

    try {
      const db = getDatabase()
      await db.table('subtasks').add(subtask)
    } catch (error) {
      console.error('Failed to persist subtask:', error)
      const index = subtasks.value.findIndex((s) => s.id === subtask.id)
      if (index !== -1) {
        subtasks.value.splice(index, 1)
      }
      throw error
    }

    return subtask
  }

  const updateSubtask = async (id: string, updates: Partial<Subtask>) => {
    const index = subtasks.value.findIndex((s) => s.id === id)
    if (index === -1) {
      throw new Error(`Subtask with id ${id} not found`)
    }

    const original = subtasks.value[index]!
    const updated: Subtask = { ...original, ...updates } as Subtask
    subtasks.value[index] = updated

    try {
      const db = getDatabase()
      await db.table('subtasks').update(id, updates)
    } catch (error) {
      console.error('Failed to update subtask:', error)
      subtasks.value[index] = original
      throw error
    }
  }

  const deleteSubtask = async (id: string) => {
    const index = subtasks.value.findIndex((s) => s.id === id)
    if (index === -1) {
      throw new Error(`Subtask with id ${id} not found`)
    }

    subtasks.value.splice(index, 1)

    try {
      const db = getDatabase()
      await db.table('subtasks').delete(id)
    } catch (error) {
      console.error('Failed to delete subtask:', error)
      throw error
    }
  }

  return {
    // State
    todoItems,
    subtasks,
    categories,
    loading,
    initialized,
    // Computed
    subtasksByTodoId,
    allItems,
    categoriesById,
    categoriesSortedByActivity,
    // Methods
    initialize,
    addCategory,
    updateCategory,
    deleteCategory,
    addTodoItem,
    updateTodoItem,
    deleteTodoItem,
    addSubtask,
    updateSubtask,
    deleteSubtask,
  }
})
