import Dexie, { type Table } from 'dexie'
import type { Project, TodoList, TodoItem, Subtask } from '@/types/todo'
import { useAuthStore } from '@/stores/auth'

/**
 * Dexie database schema for IndexedDB persistence
 */
class TodoDatabase extends Dexie {
  projects!: Table<Project>
  todoLists!: Table<TodoList>
  todoItems!: Table<TodoItem>
  subtasks!: Table<Subtask>

  constructor() {
    super('DoneDatabase')

    this.version(1).stores({
      projects: 'id, createdAt',
      todoLists: 'id, projectId, createdAt',
      todoItems: 'id, listId, createdAt, updatedAt',
      subtasks: 'id, todoId',
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
