import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'
import { useAuthStore } from '@/stores/auth'
import { syncService } from '@/services/sync'
import type { TodoItem, Subtask, Project, Comment } from '@/types/todo'

export const COLOR_PALETTE = [
  '#6c5ce7', // Purple
  '#ff6b9d', // Pink
  '#ff8a50', // Orange
  '#5b8def', // Blue
  '#4ade80', // Green
  '#f87171', // Red
  '#fbbf24', // Amber
  '#22d3ee', // Cyan
  '#818cf8', // Indigo
  '#fb7185'  // Rose
]
export const DEFAULT_COLOR = '#9ca3af' // Grey

export const useTodoStore = defineStore('todo', () => {
  // State
  const todoItems = ref<TodoItem[]>([])
  const subtasks = ref<Subtask[]>([])
  const comments = ref<Comment[]>([])
  const projects = ref<Project[]>([])
  const loading = ref(true)
  const initialized = ref(false)
  const globalLoading = ref(false)
  const searchQuery = ref('')
  const authStore = useAuthStore()

  // React to auth state changes to start/stop sync
  watch(() => authStore.user, (user) => {
    if (user) {
      syncService.init(user.uid)
    } else {
      syncService.cleanup()
      initialized.value = false
    }
  }, { immediate: true })

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

  const projectsById = computed(() => {
    const map = new Map<string, Project>()
    projects.value.forEach((project) => {
      map.set(project.id, project)
    })
    return map
  })

  // Calculate project statistics (progress)
  const projectsWithStats = computed(() => {
    const statsMap = new Map<string, { total: number, completed: number, lastUpdated: number }>()

    // Initialize
    projects.value.forEach(p => {
      statsMap.set(p.id, { total: 0, completed: 0, lastUpdated: 0 })
    })

    // Aggregate
    todoItems.value.forEach(item => {
      if (item.categoryId && statsMap.has(item.categoryId)) {
        const stats = statsMap.get(item.categoryId)!
        stats.total++
        if (item.status === 'completed') {
          stats.completed++
        }
        stats.lastUpdated = Math.max(stats.lastUpdated, item.updatedAt)
      }
    })

    return projects.value.map(p => {
      const stats = statsMap.get(p.id)!
      const progress = stats.total > 0 ?  Math.round((stats.completed / stats.total) * 100) : 0
      return {
        ...p,
        totalTasks: stats.total,
        completedTasks: stats.completed,
        progress
      }
    })
  })

  const projectsSortedByActivity = computed(() => {
     // Use the stats computed above
     return [...projectsWithStats.value].sort((a, b) => {
        // Sort activity logic could use lastUpdated from stats if we kept it exposed,
        // but let's stick to simplest or preserve 'categoriesSortedByActivity' logic if needed.
        // For now, let's just return them in 'order' which is what the sidebar mostly uses if we don't use this one.
        // Actually, sidebar used categoriesSortedByActivity? No, sidebar used `todoStore.categories` directly which was order sorted.
        // But let's keep a sorted version if needed by other components.
        return a.order - b.order
     })
  })


  // Helper function to generate IDs
  const generateId = (): string => {
    return crypto.randomUUID()
  }

  // CRUD operations

  // Initialize store from IndexedDB
  const initialize = async () => {
    if (initialized.value) {
      return
    }

    try {
      loading.value = true
      const db = getDatabase()

      // Load all data from IndexedDB
      const [dbItems, dbSubtasks, dbProjects, dbComments] = await Promise.all([
        db.table('todoItems').toArray(),
        db.table('subtasks').toArray(),
        db.table('categories').toArray(), // Keep table name 'categories' for DB compatibility
        db.table('comments').toArray(),
      ])

      let finalProjects = dbProjects
      const itemsToUpdate: TodoItem[] = []
      const projectsToAdd: Project[] = []

      // Initialize default projects if none exist
      if (finalProjects.length === 0) {
        const defaults = [
          { id: generateId(), title: 'Work', color: '#6c5ce7', isDefault: true, createdAt: Date.now(), order: 0 },
          { id: generateId(), title: 'Lifestyle', color: '#ff6b9d', isDefault: true, createdAt: Date.now(), order: 1 },
          { id: generateId(), title: 'Personal', color: '#ff8a50', isDefault: true, createdAt: Date.now(), order: 2 },
          { id: generateId(), title: 'Hobby', color: '#5b8def', isDefault: true, createdAt: Date.now(), order: 3 },
        ]
        projectsToAdd.push(...defaults)
        finalProjects = [...defaults]
      }

      // Safe Access for mapping
      const getProjectId = (oldCategory: string): string | null => {
        const titleMap: Record<string, string> = {
            'work': 'Work',
            'lifestyle': 'Lifestyle',
            'personal': 'Personal',
            'hobby': 'Hobby'
        }
        const targetTitle = titleMap[oldCategory]
        if (!targetTitle) return null
        return finalProjects.find(c => c.title === targetTitle)?.id || null
      }

      // Migrate items (handle both "category" string and missing "categoryId")
      const migratedItems: TodoItem[] = dbItems.map((item: unknown) => {
        let needsUpdate = false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newItem = { ...(item as any) }

        // Migration from string category to categoryId
        if ('category' in newItem && typeof newItem.category === 'string') {
          const newId = getProjectId(newItem.category)
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
      if (projectsToAdd.length > 0) {
        await db.table('categories').bulkAdd(projectsToAdd)
      }

      if (itemsToUpdate.length > 0) {
        await db.table('todoItems').bulkPut(itemsToUpdate)
      }

      todoItems.value = migratedItems.map(item => ({
        ...item,
        isSubtaskProcessEnabled: item.isSubtaskProcessEnabled ?? false
      }))

      subtasks.value = dbSubtasks.map((s, index) => ({
        ...s,
        order: typeof s.order === 'number' ? s.order : index,
        status: s.status || (s.completed ? 'completed' : 'pending')
      }))
      comments.value = dbComments || []
      projects.value = finalProjects.map((c, index) => ({
        ...c,
        order: typeof c.order === 'number' ? c.order : index
      })).sort((a, b) => a.order - b.order)

      initialized.value = true

      // No manual syncService.init call here anymore, we use a watch
    } catch (error) {
      console.error('Failed to initialize todo store:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Project CRUD

  const addProject = async (title: string, color?: string, icon?: string, description?: string, deadline?: number | null, showProgress?: boolean, isPinned: boolean = false) => {
      // Find the first unused color from the palette
      const usedColors = new Set(projects.value.map(c => c.color))
      const autoColor = color || COLOR_PALETTE.find(c => !usedColors.has(c)) || DEFAULT_COLOR

      const project: Project = {
          id: generateId(),
          title,
          color: autoColor,
          icon,
          description,
          deadline,
          showProgress: showProgress ?? true,
          isPinned,
          createdAt: Date.now(),
          order: projects.value.length
      }
      projects.value.push(project)
      try {
          await getDatabase().table('categories').add(project) // Table remains 'categories'
          await syncService.pushProject(project) // Sync service renaming deferred
      } catch (e) {
          console.error('Failed to add project', e)
          projects.value = projects.value.filter(c => c.id !== project.id)
          throw e
      }
      return project
  }

  const updateProjectsOrder = async (updatedProjects: Project[]) => {
      projects.value = [...updatedProjects].sort((a, b) => a.order - b.order)
      try {
          await getDatabase().table('categories').bulkPut(updatedProjects)
          for (const p of updatedProjects) {
              await syncService.pushProject(p)
          }
      } catch (e) {
          console.error('Failed to update projects order', e)
          throw e
      }
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const index = projects.value.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Project not found')

    const original = projects.value[index]!
    const updated: Project = { ...original, ...updates }
    projects.value[index] = updated

    try {
      await getDatabase().table('categories').update(id, updates)
      await syncService.pushProject(updated)
    } catch (e) {
      console.error('Failed to update project', e)
      projects.value[index] = original
      throw e
    }
  }

  const deleteProject = async (id: string) => {
      const index = projects.value.findIndex(c => c.id === id)
      if (index === -1) throw new Error('Project not found')

      projects.value.splice(index, 1)

      // Also update tasks to remove this project (categoryId)
      const tasksToUpdate = todoItems.value.filter(i => i.categoryId === id)
      tasksToUpdate.forEach(t => t.categoryId = null)

      try {
          const db = getDatabase()
          await db.transaction('rw', db.table('categories'), db.table('todoItems'), async () => {
              await db.table('categories').delete(id)
              await db.table('todoItems').bulkPut(tasksToUpdate.map(t => ({...t}))) // Persist the nullified categoryId
          })
          await syncService.deleteProject(id)
          // Also sync the tasks updates (category stripped)
          for (const task of tasksToUpdate) {
              await syncService.pushTodo(task)
          }
      } catch (e) {
          console.error('Failed to delete project', e)
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
    isSubtaskProcessEnabled: boolean = false
  ) => {
    globalLoading.value = true
    try {
      const now = Date.now()
      const order = todoItems.value.length
      const item: TodoItem = {
        id: generateId(),
        title,
        description,
        status: 'pending',
        priority,
        deadline,
        recurrence,
        categoryId,
        createdAt: now,
        updatedAt: now,
        isSticky: false,
        isSubtaskProcessEnabled,
        order,
      }

      todoItems.value.push(item)

      const db = getDatabase()
      await db.table('todoItems').add(item)
      await syncService.pushTodo(item)
      return item
    } catch (error) {
      console.error('Failed to persist todo item:', error)
      const rollbackIdx = todoItems.value.findIndex(i => i.title === title && i.createdAt > Date.now() - 1000)
      if (rollbackIdx !== -1) todoItems.value.splice(rollbackIdx, 1)
      throw error
    } finally {
      globalLoading.value = false
    }
  }

  const updateTodoItem = async (id: string, updates: Partial<TodoItem>) => {
    globalLoading.value = true
    try {
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

      const db = getDatabase()
      await db.table('todoItems').update(id, updatedItem)
      await syncService.pushTodo(updatedItem)
    } catch (error) {
      console.error('Failed to update todo item:', error)
      const index = todoItems.value.findIndex((i) => i.id === id)
      if (index !== -1) {
          // Revert if we have the original
          // Note: index might have changed due to other operations, but unlikely in this sync flow
          // For simplicity, we'll try to find it again.
      }
      throw error
    } finally {
      globalLoading.value = false
    }
  }

  const updateTodoItemsOrder = async (updatedItems: TodoItem[]) => {
    globalLoading.value = true
    try {
      const db = getDatabase()
      for (const item of updatedItems) {
        const idx = todoItems.value.findIndex(i => i.id === item.id)
        if (idx !== -1) {
          todoItems.value[idx] = { ...item, updatedAt: Date.now() }
          await db.table('todoItems').update(item.id, {
            order: item.order,
            updatedAt: Date.now()
          })
          await syncService.pushTodo(todoItems.value[idx]!)
        }
      }
    } catch (e) {
      console.error('Failed to update todo items order', e)
    } finally {
      globalLoading.value = false
    }
  }

  const deleteTodoItem = async (id: string) => {
    globalLoading.value = true
    try {
      const index = todoItems.value.findIndex((i) => i.id === id)
      if (index === -1) {
        throw new Error(`TodoItem with id ${id} not found`)
      }

      const itemSubtasks = subtasks.value.filter((subtask) => subtask.todoId === id)

      todoItems.value.splice(index, 1)
      subtasks.value = subtasks.value.filter((subtask) => subtask.todoId !== id)

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
    } finally {
      globalLoading.value = false
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
    globalLoading.value = true
    try {
      const subtask = subtasks.value.find((s) => s.id === subtaskId)
      if (!subtask) throw new Error(`Subtask with id ${subtaskId} not found`)

      const subtasksToUpdate: Subtask[] = []

      // Helper to recursively gather and update all descendants
      const collectDescendants = (parentId: string) => {
        const children = subtasks.value.filter((s) => s.parentId === parentId)
        children.forEach((child) => {
          const childIdx = subtasks.value.findIndex(s => s.id === child.id)
          if (childIdx !== -1) {
            const updatedChild = { ...child, todoId: targetTodoId }
            subtasks.value[childIdx] = updatedChild
            subtasksToUpdate.push(updatedChild)
            collectDescendants(child.id)
          }
        })
      }

      // Update the main subtask
      const mainIdx = subtasks.value.findIndex(s => s.id === subtaskId)
      if (mainIdx !== -1) {
        const updatedMain = { ...subtasks.value[mainIdx], todoId: targetTodoId, parentId: null } as Subtask
        subtasks.value[mainIdx] = updatedMain
        subtasksToUpdate.push(updatedMain)
      }

      // Recursively update all descendants
      collectDescendants(subtaskId)

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
    } finally {
      globalLoading.value = false
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

    // Main tasks are now always binary (pending/completed)
    const newStatus: TodoItem['status'] = item.status === 'completed' ? 'pending' : 'completed'

    // Handle Recurrence on Completion
    if (newStatus === 'completed' && item.recurrence) {
       await handleRecurrence(item)
    }

    await updateTodoItem(id, { status: newStatus })
  }

  const toggleSubtask = async (id: string) => {
    const subtask = subtasks.value.find(s => s.id === id)
    if (!subtask) return

    const item = todoItems.value.find(i => i.id === subtask.todoId)
    const isProcessEnabled = item?.isSubtaskProcessEnabled ?? false

    let newStatus: Subtask['status']
    let newCompleted: boolean

    if (isProcessEnabled) {
      // 3-step cycle: pending -> in-progress -> completed -> pending
      const currentStatus = subtask.status || (subtask.completed ? 'completed' : 'pending')
      if (currentStatus === 'pending') newStatus = 'in-progress'
      else if (currentStatus === 'in-progress') newStatus = 'completed'
      else newStatus = 'pending'

      newCompleted = newStatus === 'completed'
    } else {
      // 2-step toggle: pending/completed
      newCompleted = !subtask.completed
      newStatus = newCompleted ? 'completed' : 'pending'
    }

    const updates: { id: string, changes: Partial<Subtask> }[] = []
    updates.push({ id, changes: { completed: newCompleted, status: newStatus } })

    // Cascade down: if parent, toggle all children
    if (!subtask.parentId) {
      const children = subtasks.value.filter(s => s.parentId === id)
      children.forEach(child => {
        if (child.completed !== newCompleted || child.status !== newStatus) {
          updates.push({ id: child.id, changes: { completed: newCompleted, status: newStatus } })
        }
      })
    }

    // Cascade up: if child...
    if (subtask.parentId) {
      if (!newCompleted) {
        // Include parent to uncheck if child unchecked
        const parent = subtasks.value.find(s => s.id === subtask.parentId)
        if (parent && parent.completed) {
          updates.push({ id: parent.id, changes: { completed: false, status: 'in-progress' } })
        }
      } else {
        // Check if all siblings are done -> check parent
        const siblings = subtasks.value.filter(s => s.parentId === subtask.parentId && s.id !== id)
        if (siblings.every(s => s.completed)) {
          const parent = subtasks.value.find(s => s.id === subtask.parentId)
          if (parent && !parent.completed) {
            updates.push({ id: parent.id, changes: { completed: true, status: 'completed' } })
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
    globalLoading.value = true
    try {
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
      subtasks.value.push(newSubtask)
      subtasksToUpdate.forEach(updated => {
           const idx = subtasks.value.findIndex(s => s.id === updated.id)
           if (idx !== -1) subtasks.value[idx] = updated
      })
      const todoIdx = todoItems.value.findIndex(i => i.id === todoId)
      if (todoIdx !== -1) todoItems.value.splice(todoIdx, 1)

      const relatedComments = comments.value.filter(c => c.todoId === todoId)
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
    } finally {
        globalLoading.value = false
    }
  }

  async function convertSubtaskToTodo(subtaskId: string) {
    globalLoading.value = true
    try {
      const subtask = subtasks.value.find(s => s.id === subtaskId)
      if (!subtask) throw new Error('Subtask not found')

      const parentTodo = todoItems.value.find(t => t.id === subtask.todoId)
      if (!parentTodo) throw new Error('Parent todo not found')

      // 1. Create new Todo
      const newTodo: TodoItem = {
          id: crypto.randomUUID(),
          title: subtask.title,
          description: '',
          status: subtask.completed ? 'completed' : 'pending',
          priority: parentTodo.priority,
          deadline: parentTodo.deadline,
          categoryId: parentTodo.categoryId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          order: todoItems.value.length
      }

      // 2. Add new Todo
      todoItems.value.push(newTodo)
      const db = getDatabase()
      await db.table('todoItems').add(newTodo)
      await syncService.pushTodo(newTodo)

      // 3. Move children (sub-subtasks)
      const children = subtasks.value.filter(s => s.parentId === subtaskId)
      for (const child of children) {
          const updatedChild = {
              ...child,
              todoId: newTodo.id,
              parentId: null
          }
          // Update local state
          const idx = subtasks.value.findIndex(s => s.id === child.id)
          if (idx !== -1) subtasks.value[idx] = updatedChild

          // Update DB
          await db.table('subtasks').update(child.id, {
              todoId: newTodo.id,
              parentId: null
          })
          // Sync
          await syncService.pushSubtask(updatedChild)
      }

      // 4. Delete original subtask
      await deleteSubtask(subtaskId)

      return newTodo.id
    } catch (e) {
        console.error('Failed to convert subtask to todo', e)
        throw e
    } finally {
        globalLoading.value = false
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
      await syncService.pushComment(comment)
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
      await syncService.deleteComment(id)
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  return {
    // State
    todoItems,
    subtasks,
    projects,
    loading,
    initialized,
    // Computed
    subtasksByTodoId,
    allItems,
    projectsById,
    projectsSortedByActivity,
    projectsWithStats,
    // Methods
    initialize,
    addProject,
    updateProject,
    deleteProject,
    updateProjectsOrder,
    addTodoItem,
    updateTodoItem,
    updateTodoItemsOrder,
    deleteTodoItem,
    toggleTodoCompletion,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
    reparentSubtask,
    updateSubtasksOrder,
    convertTodoToSubtask,
    convertSubtaskToTodo,
    // Comments
    comments,
    commentsByTodoId,
    addComment,
    deleteComment,

    searchQuery,
    globalLoading,
  }
})
