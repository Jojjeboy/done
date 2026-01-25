import { db } from '@/firebase'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  type Unsubscribe
} from 'firebase/firestore'
import { useTodoStore } from '@/stores/todo'
import type { TodoItem, Category, Subtask } from '@/types/todo'
import { getDatabase } from '@/db'

class SyncService {
  private userId: string | null = null
  private unsubscribers: Unsubscribe[] = []
  private isSyncing = false

  public init(userId: string) {
    if (this.userId === userId) return
    this.cleanup()
    this.userId = userId
    this.startListening()
  }

  public cleanup() {
    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []
    this.userId = null
  }

  private startListening() {
    if (!this.userId) return

    const todoStore = useTodoStore()
    const dexieDb = getDatabase()

    // 1. Listen to Todos
    const todosQuery = collection(db, `users/${this.userId}/todos`)
    this.unsubscribers.push(onSnapshot(todosQuery, async (snapshot) => {
      this.isSyncing = true
      try {
        const changes = snapshot.docChanges()
        for (const change of changes) {
            const data = change.doc.data() as TodoItem
            if (change.type === 'added' || change.type === 'modified') {
                // Update local Dexie first
                await dexieDb.table('todoItems').put(data)

                // Then update Store
                const index = todoStore.todoItems.findIndex(i => i.id === data.id)
                if (index !== -1) {
                    todoStore.todoItems[index] = data
                } else {
                    todoStore.todoItems.push(data)
                }
            } else if (change.type === 'removed') {
                await dexieDb.table('todoItems').delete(change.doc.id)
                const index = todoStore.todoItems.findIndex(i => i.id === change.doc.id)
                if (index !== -1) todoStore.todoItems.splice(index, 1)
            }
        }
      } finally {
        this.isSyncing = false
      }
    }))

    // 2. Listen to Categories
    const categoriesQuery = collection(db, `users/${this.userId}/categories`)
    this.unsubscribers.push(onSnapshot(categoriesQuery, async (snapshot) => {
        this.isSyncing = true
        try {
            const changes = snapshot.docChanges()
            for (const change of changes) {
                const data = change.doc.data() as Category
                if (change.type === 'added' || change.type === 'modified') {
                    await dexieDb.table('categories').put(data)
                    const index = todoStore.categories.findIndex(c => c.id === data.id)
                    if (index !== -1) {
                        todoStore.categories[index] = data
                    } else {
                        todoStore.categories.push(data)
                    }
                } else if (change.type === 'removed') {
                    await dexieDb.table('categories').delete(change.doc.id)
                    const index = todoStore.categories.findIndex(c => c.id === change.doc.id)
                    if (index !== -1) todoStore.categories.splice(index, 1)
                }
            }
        } finally {
            this.isSyncing = false
        }
    }))

     // 3. Listen to Subtasks
     const subtasksQuery = collection(db, `users/${this.userId}/subtasks`)
     this.unsubscribers.push(onSnapshot(subtasksQuery, async (snapshot) => {
         this.isSyncing = true
         try {
             const changes = snapshot.docChanges()
             for (const change of changes) {
                 const data = change.doc.data() as Subtask
                 if (change.type === 'added' || change.type === 'modified') {
                     await dexieDb.table('subtasks').put(data)
                     const index = todoStore.subtasks.findIndex(s => s.id === data.id)
                     if (index !== -1) {
                         // Update existing
                         Object.assign(todoStore.subtasks[index], data)
                     } else {
                         todoStore.subtasks.push(data)
                     }
                 } else if (change.type === 'removed') {
                     await dexieDb.table('subtasks').delete(change.doc.id)
                     const index = todoStore.subtasks.findIndex(s => s.id === change.doc.id)
                     if (index !== -1) todoStore.subtasks.splice(index, 1)
                 }
             }
         } finally {
             this.isSyncing = false
         }
     }))
  }

  // --- Push Methods ---

  public async pushTodo(todo: TodoItem) {
    if (!this.userId) return
    if (this.isSyncing) return // Avoid loop if possible, though listener handles it mostly

    // Safety check: remove undefined values
    const data = JSON.parse(JSON.stringify(todo))
    await setDoc(doc(db, `users/${this.userId}/todos`, todo.id), data)
  }

  public async deleteTodo(todoId: string) {
    if (!this.userId) return
    await deleteDoc(doc(db, `users/${this.userId}/todos`, todoId))
  }

  public async pushCategory(category: Category) {
    if (!this.userId) return
    const data = JSON.parse(JSON.stringify(category))
    await setDoc(doc(db, `users/${this.userId}/categories`, category.id), data)
  }

  public async deleteCategory(categoryId: string) {
    if (!this.userId) return
    await deleteDoc(doc(db, `users/${this.userId}/categories`, categoryId))
  }

  public async pushSubtask(subtask: Subtask) {
    if (!this.userId) return
    const data = JSON.parse(JSON.stringify(subtask))
    await setDoc(doc(db, `users/${this.userId}/subtasks`, subtask.id), data)
  }

  public async deleteSubtask(subtaskId: string) {
      if (!this.userId) return
      await deleteDoc(doc(db, `users/${this.userId}/subtasks`, subtaskId))
  }


}

export const syncService = new SyncService()
