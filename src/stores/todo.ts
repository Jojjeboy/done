import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getDatabase } from '@/db'
import type { Project, TodoList, TodoItem, Subtask } from '@/types/todo'

export const useTodoStore = defineStore('todo', () => {
  // State
  const projects = ref<Project[]>([])
  const todoLists = ref<TodoList[]>([])
  const todoItems = ref<TodoItem[]>([])
  const subtasks = ref<Subtask[]>([])
  const loading = ref(true)
  const initialized = ref(false)

  // Computed
  const projectsByProjectId = computed(() => {
    const map = new Map<string, Project>()
    projects.value.forEach((project) => {
      map.set(project.id, project)
    })
    return map
  })

  const listsByProjectId = computed(() => {
    const map = new Map<string, TodoList[]>()
    todoLists.value.forEach((list) => {
      if (!map.has(list.projectId)) {
        map.set(list.projectId, [])
      }
      map.get(list.projectId)!.push(list)
    })
    return map
  })

  const itemsByListId = computed(() => {
    const map = new Map<string, TodoItem[]>()
    todoItems.value.forEach((item) => {
      if (!map.has(item.listId)) {
        map.set(item.listId, [])
      }
      map.get(item.listId)!.push(item)
    })
    return map
  })

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
      const [dbProjects, dbLists, dbItems, dbSubtasks] = await Promise.all([
        db.projects.toArray(),
        db.todoLists.toArray(),
        db.todoItems.toArray(),
        db.subtasks.toArray(),
      ])

      projects.value = dbProjects
      todoLists.value = dbLists
      todoItems.value = dbItems
      subtasks.value = dbSubtasks

      initialized.value = true
    } catch (error) {
      console.error('Failed to initialize todo store:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // Project CRUD
  const addProject = async (title: string, color: string = '#6366f1') => {
    const project: Project = {
      id: generateId(),
      title,
      color,
      createdAt: Date.now(),
    }

    projects.value.push(project)

    try {
      const db = getDatabase()
      await db.projects.add(project)
    } catch (error) {
      console.error('Failed to persist project:', error)
      // Rollback on error
      const index = projects.value.findIndex((p) => p.id === project.id)
      if (index !== -1) {
        projects.value.splice(index, 1)
      }
      throw error
    }

    return project
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const index = projects.value.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project with id ${id} not found`)
    }

    const original = projects.value[index]!
    const updated: Project = { ...original, ...updates } as Project
    projects.value[index] = updated

    try {
      const db = getDatabase()
      await db.projects.update(id, updates)
    } catch (error) {
      console.error('Failed to update project:', error)
      // Rollback on error
      projects.value[index] = original
      throw error
    }
  }

  const deleteProject = async (id: string) => {
    const index = projects.value.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project with id ${id} not found`)
    }

    // Remove project and all related data
    const projectLists = todoLists.value.filter((list) => list.projectId === id)
    const listIds = projectLists.map((list) => list.id)
    const projectItems = todoItems.value.filter((item) => listIds.includes(item.listId))
    const itemIds = projectItems.map((item) => item.id)
    const projectSubtasks = subtasks.value.filter((subtask) => itemIds.includes(subtask.todoId))

    // Remove from state
    projects.value.splice(index, 1)
    todoLists.value = todoLists.value.filter((list) => list.projectId !== id)
    todoItems.value = todoItems.value.filter((item) => !listIds.includes(item.listId))
    subtasks.value = subtasks.value.filter((subtask) => !itemIds.includes(subtask.todoId))

    try {
      const db = getDatabase()
      await db.transaction('rw', db.projects, db.todoLists, db.todoItems, db.subtasks, async () => {
        await db.projects.delete(id)
        await db.todoLists.bulkDelete(listIds)
        await db.todoItems.bulkDelete(itemIds)
        await db.subtasks.bulkDelete(projectSubtasks.map((s) => s.id))
      })
    } catch (error) {
      console.error('Failed to delete project:', error)
      // Note: Rollback would be complex here, so we'll just log the error
      throw error
    }
  }

  // TodoList CRUD
  const addTodoList = async (projectId: string, title: string) => {
    const list: TodoList = {
      id: generateId(),
      projectId,
      title,
      createdAt: Date.now(),
    }

    todoLists.value.push(list)

    try {
      const db = getDatabase()
      await db.todoLists.add(list)
    } catch (error) {
      console.error('Failed to persist todo list:', error)
      const index = todoLists.value.findIndex((l) => l.id === list.id)
      if (index !== -1) {
        todoLists.value.splice(index, 1)
      }
      throw error
    }

    return list
  }

  const updateTodoList = async (id: string, updates: Partial<TodoList>) => {
    const index = todoLists.value.findIndex((l) => l.id === id)
    if (index === -1) {
      throw new Error(`TodoList with id ${id} not found`)
    }

    const original = todoLists.value[index]!
    const updated: TodoList = { ...original, ...updates } as TodoList
    todoLists.value[index] = updated

    try {
      const db = getDatabase()
      await db.todoLists.update(id, updates)
    } catch (error) {
      console.error('Failed to update todo list:', error)
      todoLists.value[index] = original
      throw error
    }
  }

  const deleteTodoList = async (id: string) => {
    const index = todoLists.value.findIndex((l) => l.id === id)
    if (index === -1) {
      throw new Error(`TodoList with id ${id} not found`)
    }

    const listItems = todoItems.value.filter((item) => item.listId === id)
    const itemIds = listItems.map((item) => item.id)
    const listSubtasks = subtasks.value.filter((subtask) => itemIds.includes(subtask.todoId))

    todoLists.value.splice(index, 1)
    todoItems.value = todoItems.value.filter((item) => item.listId !== id)
    subtasks.value = subtasks.value.filter((subtask) => !itemIds.includes(subtask.todoId))

    try {
      const db = getDatabase()
      await db.transaction('rw', db.todoLists, db.todoItems, db.subtasks, async () => {
        await db.todoLists.delete(id)
        await db.todoItems.bulkDelete(itemIds)
        await db.subtasks.bulkDelete(listSubtasks.map((s) => s.id))
      })
    } catch (error) {
      console.error('Failed to delete todo list:', error)
      throw error
    }
  }

  // TodoItem CRUD
  const addTodoItem = async (
    listId: string,
    title: string,
    description: string = '',
    priority: TodoItem['priority'] = 'medium',
    deadline: number | null = null
  ) => {
    const now = Date.now()
    const item: TodoItem = {
      id: generateId(),
      listId,
      title,
      description,
      status: 'pending',
      priority,
      deadline,
      createdAt: now,
      updatedAt: now,
    }

    todoItems.value.push(item)

    try {
      const db = getDatabase()
      await db.todoItems.add(item)
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
      await db.todoItems.update(id, updatedItem)
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
      await db.transaction('rw', db.todoItems, db.subtasks, async () => {
        await db.todoItems.delete(id)
        await db.subtasks.bulkDelete(itemSubtasks.map((s) => s.id))
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
      await db.subtasks.add(subtask)
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
      await db.subtasks.update(id, updates)
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
      await db.subtasks.delete(id)
    } catch (error) {
      console.error('Failed to delete subtask:', error)
      throw error
    }
  }

  return {
    // State
    projects,
    todoLists,
    todoItems,
    subtasks,
    loading,
    initialized,
    // Computed
    projectsByProjectId,
    listsByProjectId,
    itemsByListId,
    subtasksByTodoId,
    // Methods
    initialize,
    addProject,
    updateProject,
    deleteProject,
    addTodoList,
    updateTodoList,
    deleteTodoList,
    addTodoItem,
    updateTodoItem,
    deleteTodoItem,
    addSubtask,
    updateSubtask,
    deleteSubtask,
  }
})
