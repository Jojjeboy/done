import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'
import { useSettingsStore } from '@/stores/settings'
import { useAuthStore } from '@/stores/auth'
import { syncService } from '@/services/sync'
import type { TodoItem, Subtask, Category, Comment } from '@/types/todo'

export const useTodoStore = defineStore('todo', () => {
  // State
  const todoItems = ref<TodoItem[]>([])
  const subtasks = ref<Subtask[]>([])
  const comments = ref<Comment[]>([])
  const categories = ref<Category[]>([])
  const loading = ref(true)
  const initialized = ref(false)
  const searchQuery = ref('')

  // Computed
  const subtasksByTodoId = computed(() => {
    const map = new Map<string, Subtask[]>()
    subtasks.value.forEach((subtask) => {
      if (!map.has(subtask.todoId)) {
        map.set(subtask.todoId, [])
      }
      map.get(subtask.todoId)!.push(subtask)
    })
    // Sort each list by order asc
    map.forEach((list) => list.sort((a, b) => (a.order || 0) - (b.order || 0)))
    return map
  })

  const commentsByTodoId = computed(() => {
    const map = new Map<string, Comment[]>()
    comments.value.forEach((comment) => {
      if (!map.has(comment.todoId)) {
        map.set(comment.todoId, [])
      }
      map.get(comment.todoId)!.push(comment)
    })
    // Sort by date asc
    map.forEach((list) => list.sort((a, b) => a.createdAt - b.createdAt))
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
      const [dbItems, dbSubtasks, dbCategories, dbComments] = await Promise.all([
        db.table('todoItems').toArray(),
        db.table('subtasks').toArray(),
        db.table('categories').toArray(),
        db.table('comments').toArray(),
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
      subtasks.value = dbSubtasks.map((s, index) => ({
        ...s,
        order: typeof s.order === 'number' ? s.order : index
      }))
      comments.value = dbComments || []
      categories.value = finalCategories

      initialized.value = true

      // Initialize Sync
      const authStore = useAuthStore()
      if (authStore.user) {
          syncService.init(authStore.user.uid)
      }
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
          await syncService.pushCategory(category)
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
      await syncService.pushCategory(updated)
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
          await syncService.deleteCategory(id)
          // Also sync the tasks updates (category stripped)
          for (const task of tasksToUpdate) {
              await syncService.pushTodo(task)
          }
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
    categoryId: string | null = null,
    recurrence: TodoItem['recurrence'] = null,
    location: TodoItem['location'] = null
  ) => {
    const now = Date.now()
    const item: TodoItem = {
      id: generateId(),
      title,
      description,
      status: 'pending',
      priority,
      deadline,
      recurrence,
      categoryId,
      location,
      createdAt: now,
      updatedAt: now,
    }

    todoItems.value.push(item)

    try {
      const db = getDatabase()
      await db.table('todoItems').add(item)
      await syncService.pushTodo(item)
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
      await syncService.pushTodo(updatedItem)
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
      await syncService.deleteTodo(id)
      for (const sub of itemSubtasks) {
          await syncService.deleteSubtask(sub.id)
      }
    } catch (error) {
      console.error('Failed to delete todo item:', error)
      throw error
    }
  }

  // Subtask CRUD
  const addSubtask = async (todoId: string, title: string, parentId: string | null = null) => {
    // Get max order for this parentId/todoId
    const existing = subtasks.value.filter(s => s.todoId === todoId && s.parentId === parentId)
    const maxOrder = existing.length > 0 ? Math.max(...existing.map(s => s.order || 0)) : -1

    const subtask: Subtask = {
      id: generateId(),
      todoId,
      title,
      completed: false,
      parentId,
      order: maxOrder + 1
    }

    subtasks.value.push(subtask)

    try {
      const db = getDatabase()
      await db.table('subtasks').add(subtask)
      await syncService.pushSubtask(subtask)
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
      await syncService.pushSubtask(updated)
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

    const subtaskToDelete = subtasks.value[index]
    if (!subtaskToDelete) return

    const idsToDelete = [id]

    // If it's a parent, find all children to delete
    if (!subtaskToDelete.parentId) {
      const children = subtasks.value.filter(s => s.parentId === id)
      idsToDelete.push(...children.map(c => c.id))
    }

    // Remove from local state
    subtasks.value = subtasks.value.filter(s => !idsToDelete.includes(s.id))

    try {
      const db = getDatabase()
      await db.table('subtasks').bulkDelete(idsToDelete)
      for (const dId of idsToDelete) {
          await syncService.deleteSubtask(dId)
      }
    } catch (error) {
      // Revert is complex here, for now just log
      console.error('Failed to delete subtask:', error)
      // Ideally fetch from DB again to restore state
      throw error
    }
  }

  const reparentSubtask = async (subtaskId: string, targetTodoId: string) => {
    const subtask = subtasks.value.find((s) => s.id === subtaskId)
    if (!subtask) throw new Error(`Subtask with id ${subtaskId} not found`)

    const subtasksToUpdate: Subtask[] = []

    // Helper to recursively gather and update all descendants
    const collectDescendants = (parentId: string) => {
      const children = subtasks.value.filter((s) => s.parentId === parentId)
      children.forEach((child) => {
        child.todoId = targetTodoId
        subtasksToUpdate.push({ ...child })
        collectDescendants(child.id)
      })
    }

    // Update the main subtask
    subtask.todoId = targetTodoId
    subtask.parentId = null // Becomes top-level in the new task
    subtasksToUpdate.push({ ...subtask })

    // Recursively update all descendants
    collectDescendants(subtaskId)

    try {
      const db = getDatabase()
      await db.transaction('rw', db.table('subtasks'), async () => {
        await db.table('subtasks').bulkPut(subtasksToUpdate)
      })

      // Sync changes
      for (const updated of subtasksToUpdate) {
        await syncService.pushSubtask(updated)
      }
    } catch (error) {
      console.error('Failed to reparent subtask:', error)
      throw error
    }
  }

  const updateSubtasksOrder = async (updates: Subtask[]) => {
    // Update local state
    updates.forEach(updated => {
      const index = subtasks.value.findIndex(s => s.id === updated.id)
      if (index !== -1) {
        subtasks.value[index] = { ...updated }
      }
    })

    try {
      const db = getDatabase()
      await db.table('subtasks').bulkPut(updates)
      for (const updated of updates) {
        await syncService.pushSubtask(updated)
      }
    } catch (error) {
      console.error('Failed to update subtasks order:', error)
      throw error
    }
  }

  const toggleTodoCompletion = async (id: string) => {
    const item = todoItems.value.find(i => i.id === id)
    if (!item) return

    const settingsStore = useSettingsStore()

    // Determine new status
    let newStatus: TodoItem['status']
    if (settingsStore.isThreeStepEnabled) {
        if (item.status === 'pending') newStatus = 'in-progress'
        else if (item.status === 'in-progress') newStatus = 'completed'
        else newStatus = 'pending'
    } else {
        newStatus = item.status === 'completed' ? 'pending' : 'completed'
    }

    // Handle Recurrence on Completion
    if (newStatus === 'completed' && item.recurrence) {
       await handleRecurrence(item)
    }

    await updateTodoItem(id, { status: newStatus })
  }

  const toggleSubtask = async (id: string) => {
    const subtask = subtasks.value.find(s => s.id === id)
    if (!subtask) return

    const newCompleted = !subtask.completed
    const updates: { id: string, changes: Partial<Subtask> }[] = []

    updates.push({ id, changes: { completed: newCompleted } })

    // Cascade down: if parent, toggle all children (if strict logic desired, usually yes)
    if (!subtask.parentId) {
        const children = subtasks.value.filter(s => s.parentId === id)
        children.forEach(child => {
            if (child.completed !== newCompleted) {
                updates.push({ id: child.id, changes: { completed: newCompleted } })
            }
        })
    }

    // Cascade up: if child...
    if (subtask.parentId) {
        if (!newCompleted) {
            // Include parent to uncheck if child unchecked
            const parent = subtasks.value.find(s => s.id === subtask.parentId)
            if (parent && parent.completed) {
                updates.push({ id: parent.id, changes: { completed: false } })
            }
        } else {
             // Check if all siblings are done -> check parent
             const siblings = subtasks.value.filter(s => s.parentId === subtask.parentId && s.id !== id)
             if (siblings.every(s => s.completed)) {
                 const parent = subtasks.value.find(s => s.id === subtask.parentId)
                 if (parent && !parent.completed) {
                      updates.push({ id: parent.id, changes: { completed: true } })
                 }
             }
        }
    }

    // Apply updates
    updates.forEach(u => {
        const idx = subtasks.value.findIndex(s => s.id === u.id)
        if (idx !== -1) {
            subtasks.value[idx] = { ...subtasks.value[idx], ...u.changes } as Subtask
        }
    })

    // Persist
    try {
        const db = getDatabase()
        await db.transaction('rw', db.table('subtasks'), async () => {
             for (const u of updates) {
                 await db.table('subtasks').update(u.id, u.changes)
             }
        })
        for (const u of updates) {
            // Construct full object to push? Or just update? Sync expects full push usually or specific update function
            // Looking at other methods, pushSubtask takes full object.
            const updatedSubtask = subtasks.value.find(s => s.id === u.id) // It's already updated locally
            if (updatedSubtask) await syncService.pushSubtask(updatedSubtask)
        }
    } catch (e) {
        console.error('Failed to toggle subtasks', e)
        // Revert? Logic tricky.
    }
  }

  const convertTodoToSubtask = async (todoId: string, targetTodoId: string) => {
    const todo = todoItems.value.find((i) => i.id === todoId)
    if (!todo) throw new Error(`Todo with id ${todoId} not found`)

    // 1. Create new subtask in target todo
    // Determine order: put at end
    const targetSubtasks = subtasks.value.filter(s => s.todoId === targetTodoId && !s.parentId)
    const order = targetSubtasks.length > 0 ? Math.max(...targetSubtasks.map(s => s.order)) + 1 : 0

    const newSubtaskId = generateId()
    const newSubtask: Subtask = {
        id: newSubtaskId,
        todoId: targetTodoId,
        title: todo.title,
        completed: todo.status === 'completed',
        parentId: null,
        order
    }

    // 2. Gather existing subtasks to move
    const childSubtasks = subtasks.value.filter(s => s.todoId === todoId)
    const subtasksToUpdate: Subtask[] = []

    // Flatten logic: All children become children of the new subtask
    // Note: We ignore the original hierarchy for simplicity as per plan (2-level depth max)
    // Or we can try to preserve direct children as children of new subtask.
    // The plan says: "All existing subtasks of Task A (both parents and children) will be flattened to become direct children of 'Subtask A'."

    childSubtasks.forEach((child, index) => {
        subtasksToUpdate.push({
            ...child,
            todoId: targetTodoId,
            parentId: newSubtaskId,
            order: index // simple re-ordering
        })
    })

    try {
        const db = getDatabase()
        await db.transaction('rw', db.table('todoItems'), db.table('subtasks'), db.table('comments'), async () => {
             // Add new subtask
             await db.table('subtasks').add(newSubtask)

             // Move children
             if (subtasksToUpdate.length > 0) {
                 await db.table('subtasks').bulkPut(subtasksToUpdate)
             }

             // Delete original todo
             await db.table('todoItems').delete(todoId)
        })

        // Clean up local state
        // Add new subtask
        subtasks.value.push(newSubtask)

        // Update children in local state
        subtasksToUpdate.forEach(updated => {
             const idx = subtasks.value.findIndex(s => s.id === updated.id)
             if (idx !== -1) subtasks.value[idx] = updated
        })

        // Remove todo
        const todoIdx = todoItems.value.findIndex(i => i.id === todoId)
        if (todoIdx !== -1) todoItems.value.splice(todoIdx, 1)

        // Deleting comments for original todo?
        // Plan says: "Delete source todo (and its comments)."
        const relatedComments = comments.value.filter(c => c.todoId === todoId)
        // Cleanup comments from DB? Not in transaction above, let's just leave orphaned or delete them.
        // Better to delete.
        if (relatedComments.length > 0) {
             await db.table('comments').bulkDelete(relatedComments.map(c => c.id))
             comments.value = comments.value.filter(c => c.todoId !== todoId)
        }

        // Sync
        await syncService.pushSubtask(newSubtask)
        for (const child of subtasksToUpdate) {
            await syncService.pushSubtask(child)
        }
        await syncService.deleteTodo(todoId)

    } catch (e) {
        console.error('Failed to convert todo to subtask', e)
        throw e
    }
  }

  const handleRecurrence = async (item: TodoItem) => {
      // Calculate new deadline
      // Create new item
      if (!item.deadline) return // Recurrence needs a base date

      const oldDate = new Date(item.deadline)
      const newDate = new Date(oldDate)

      if (item.recurrence === 'daily') newDate.setDate(newDate.getDate() + 1)
      if (item.recurrence === 'weekly') newDate.setDate(newDate.getDate() + 7)
      if (item.recurrence === 'monthly') newDate.setMonth(newDate.getMonth() + 1)

      await addTodoItem(
          item.title,
          item.description,
          item.priority,
          newDate.getTime(),
          item.categoryId || null,
          item.recurrence
      )
      // We also update the new item to have the same recurrence!
      // But addTodoItem doesn't accept recurrence arg yet. We need to update it or update item after.
      // Let's rely on update for now or update addTodoItem signature.
      // Updating addTodoItem signature is better.
  }

  // Comment CRUD
  const addComment = async (todoId: string, text: string) => {
    const authStore = useAuthStore()
    const comment: Comment = {
      id: generateId(),
      todoId,
      text,
      createdAt: Date.now(),
      userId: authStore.user?.uid || 'anonymous',
    }

    comments.value.push(comment)

    try {
      const db = getDatabase()
      await db.table('comments').add(comment)
    } catch (error) {
      console.error('Failed to persist comment:', error)
      const index = comments.value.findIndex((c) => c.id === comment.id)
      if (index !== -1) comments.value.splice(index, 1)
      throw error
    }
    return comment
  }

  const deleteComment = async (id: string) => {
    const index = comments.value.findIndex((c) => c.id === id)
    if (index === -1) return

    comments.value.splice(index, 1)

    try {
      const db = getDatabase()
      await db.table('comments').delete(id)
    } catch (error) {
      console.error('Failed to delete comment:', error)
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
    toggleTodoCompletion,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
    reparentSubtask,
    updateSubtasksOrder,
    convertTodoToSubtask,
    // Comments
    comments,
    commentsByTodoId,
    addComment,
    deleteComment,

    searchQuery,
  }
})
