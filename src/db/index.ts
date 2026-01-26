import Dexie, { type Table } from 'dexie'
import type { TodoItem, Subtask, Category, Comment } from '@/types/todo'
import { useAuthStore } from '@/stores/auth'

/**
 * Dexie database schema for IndexedDB persistence
 */
interface Setting {
  key: string
  value: string | number | boolean
}

class TodoDatabase extends Dexie {
  todoItems!: Table<TodoItem>
  subtasks!: Table<Subtask>
  categories!: Table<Category>
  comments!: Table<Comment>
  settings!: Table<Setting>

  constructor() {
    super('DoneDatabase')

    this.version(1).stores({
      projects: 'id, createdAt',
      todoLists: 'id, projectId, createdAt',
      todoItems: 'id, listId, createdAt, updatedAt',
      subtasks: 'id, todoId',
    })

    this.version(2).stores({
      projects: 'id, createdAt',
      todoLists: 'id, projectId, createdAt',
      todoItems: 'id, listId, createdAt, updatedAt',
      subtasks: 'id, todoId',
      settings: 'key',
    })

    this.version(3).stores({
      projects: 'id, createdAt',
      todoLists: 'id, projectId, createdAt',
      todoItems: 'id, listId, createdAt, updatedAt, deadline',
      subtasks: 'id, todoId',
      settings: 'key',
    })

    this.version(4).stores({
      todoItems: 'id, createdAt, updatedAt, deadline',
      subtasks: 'id, todoId',
      settings: 'key',
    })

    this.version(5).stores({
      todoItems: 'id, createdAt, updatedAt, deadline, categoryId',
      subtasks: 'id, todoId',
      categories: 'id, createdAt',
      settings: 'key',
    })

    this.version(6).stores({
      todoItems: 'id, createdAt, updatedAt, deadline, categoryId',
      subtasks: 'id, todoId',
      categories: 'id, createdAt',
      settings: 'key',
      comments: 'id, todoId',
    })
  }
}

// Cache database instances per user
const databaseCache = new Map<string, TodoDatabase>()

/**
 * Get database instance scoped to current user
 */
export function getDatabase(): TodoDatabase {
  const authStore = useAuthStore()
  const userId = authStore.user?.uid

  if (!userId) {
    throw new Error('User must be authenticated to access database')
  }

  // Return cached database instance for this user, or create a new one
  if (!databaseCache.has(userId)) {
    const db = new TodoDatabase()
    databaseCache.set(userId, db)
    return db
  }

  return databaseCache.get(userId)!
}

/**
 * Clear database cache (useful for logout)
 */
export function clearDatabaseCache(): void {
  databaseCache.clear()
}

export type { TodoDatabase }
