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
import { useSettingsStore } from '@/stores/settings'
import type { TodoItem, Project, Subtask, Comment } from '@/types/todo'
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
    const settingsStore = useSettingsStore()
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
                    const existing = todoStore.todoItems[index]
                    if (existing) {
                        todoStore.todoItems[index] = data
                    }
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

    // 2. Listen to Projects (Firestore collection still named 'categories' for migration)
    const categoriesQuery = collection(db, `users/${this.userId}/categories`)
    this.unsubscribers.push(onSnapshot(categoriesQuery, async (snapshot) => {
        this.isSyncing = true
        try {
            const changes = snapshot.docChanges()
            for (const change of changes) {
                const data = change.doc.data() as Project
                if (change.type === 'added' || change.type === 'modified') {
                    await dexieDb.table('categories').put(data)
                    const index = todoStore.projects.findIndex(p => p.id === data.id)
                    if (index !== -1) {
                        const existing = todoStore.projects[index]
                        if (existing) {
                            todoStore.projects[index] = data
                        }
                    } else {
                        todoStore.projects.push(data)
                    }
                } else if (change.type === 'removed') {
                    await dexieDb.table('categories').delete(change.doc.id)
                    const index = todoStore.projects.findIndex(p => p.id === change.doc.id)
                    if (index !== -1) todoStore.projects.splice(index, 1)
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
                         const existing = todoStore.subtasks[index]
                         if (existing) {
                             Object.assign(existing, data)
                         }
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

      // 4. Listen to Settings
      const settingsQuery = collection(db, `users/${this.userId}/settings`)
      this.unsubscribers.push(onSnapshot(settingsQuery, async (snapshot) => {
          this.isSyncing = true
          try {
              const changes = snapshot.docChanges()
              for (const change of changes) {
                  const data = change.doc.data() as { key: string; value: unknown }
                  if (change.type === 'added' || change.type === 'modified') {
                      await dexieDb.table('settings').put(data, 'key')

                      // Update settings store reactively
                      if (data.key === 'isThreeStepEnabled') {
                          settingsStore.updateThreeStepFromSync(!!data.value)
                      } else if (data.key === 'focusModeTaskIds') {
                          try {
                              const ids = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
                              settingsStore.updateFocusModeFromSync(ids)
                          } catch (e) {
                              console.error('Failed to parse focusModeTaskIds from sync', e)
                          }
                      }
                  } else if (change.type === 'removed') {
                      await dexieDb.table('settings').delete(change.doc.id)
                  }
              }
          } finally {
              this.isSyncing = false
          }
      }))

      // 5. Listen to Comments
      const commentsQuery = collection(db, `users/${this.userId}/comments`)
      this.unsubscribers.push(onSnapshot(commentsQuery, async (snapshot) => {
          this.isSyncing = true
          try {
              const changes = snapshot.docChanges()
              for (const change of changes) {
                  const data = change.doc.data() as Comment
                  if (change.type === 'added' || change.type === 'modified') {
                      await dexieDb.table('comments').put(data)
                      const index = todoStore.comments.findIndex(c => c.id === data.id)
                      if (index !== -1) {
                          todoStore.comments[index] = data
                      } else {
                          todoStore.comments.push(data)
                      }
                  } else if (change.type === 'removed') {
                      await dexieDb.table('comments').delete(change.doc.id)
                      const index = todoStore.comments.findIndex(c => c.id === change.doc.id)
                      if (index !== -1) todoStore.comments.splice(index, 1)
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

  public async pushProject(project: Project) {
    if (!this.userId) return
    const data = JSON.parse(JSON.stringify(project))
    await setDoc(doc(db, `users/${this.userId}/categories`, project.id), data)
  }

  public async deleteProject(projectId: string) {
    if (!this.userId) return
    await deleteDoc(doc(db, `users/${this.userId}/categories`, projectId))
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

  public async pushSetting(key: string, value: string | number | boolean) {
    if (!this.userId) return
    if (this.isSyncing) return // Avoid loop
    const data = { key, value }
    await setDoc(doc(db, `users/${this.userId}/settings`, key), data)
  }

  public async pushComment(comment: Comment) {
    if (!this.userId) return
    const data = JSON.parse(JSON.stringify(comment))
    await setDoc(doc(db, `users/${this.userId}/comments`, comment.id), data)
  }

  public async deleteComment(commentId: string) {
    if (!this.userId) return
    await deleteDoc(doc(db, `users/${this.userId}/comments`, commentId))
  }


}

export const syncService = new SyncService()
