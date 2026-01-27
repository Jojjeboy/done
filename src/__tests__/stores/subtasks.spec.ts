import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTodoStore } from '@/stores/todo'
import type { Subtask } from '@/types/todo'

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { uid: 'test-user' }
  }))
}))

describe('Subtasks Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('can add a subtask to a todo', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Test Task')
    const subtask = await store.addSubtask(todo.id, 'Test Subtask')

    expect(store.subtasks.length).toBe(1)
    expect(subtask.title).toBe('Test Subtask')
    expect(subtask.parentId).toBeNull()
  })

  it('can add a nested subtask', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Test Task')
    const parent = await store.addSubtask(todo.id, 'Parent Subtask')
    const child = await store.addSubtask(todo.id, 'Child Subtask', parent.id)

    expect(store.subtasks.length).toBe(2)
    expect(child.parentId).toBe(parent.id)
  })

  it('cascades deletion: deleting parent deletes child', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Test Task')
    const parent = await store.addSubtask(todo.id, 'Parent')
    await store.addSubtask(todo.id, 'Child', parent.id)

    expect(store.subtasks.length).toBe(2)

    await store.deleteSubtask(parent.id)

    expect(store.subtasks.length).toBe(0)
  })

  it('cascades completion: completing parent completes child', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Task')
    const parent = await store.addSubtask(todo.id, 'Parent')
    const child = await store.addSubtask(todo.id, 'Child', parent.id)

    // Complete parent
    await store.toggleSubtask(parent.id)

    const updatedParent = store.subtasks.find((s: Subtask) => s.id === parent.id)
    const updatedChild = store.subtasks.find((s: Subtask) => s.id === child.id)

    expect(updatedParent?.completed).toBe(true)
    expect(updatedChild?.completed).toBe(true)
  })

  it('cascades completion: uncompleting parent uncompletes child', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Task')
    const parent = await store.addSubtask(todo.id, 'Parent')
    const child = await store.addSubtask(todo.id, 'Child', parent.id)

    // Set both to completed first
    await store.toggleSubtask(parent.id)

    // Now uncheck parent
    await store.toggleSubtask(parent.id)

    const updatedParent = store.subtasks.find((s: Subtask) => s.id === parent.id)
    const updatedChild = store.subtasks.find((s: Subtask) => s.id === child.id)

    expect(updatedParent?.completed).toBe(false)
    expect(updatedChild?.completed).toBe(false)
  })

  it('reverse cascade: completing all children completes parent', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Task')
    const parent = await store.addSubtask(todo.id, 'Parent')
    const child1 = await store.addSubtask(todo.id, 'Child 1', parent.id)
    const child2 = await store.addSubtask(todo.id, 'Child 2', parent.id)

    // Complete child 1
    await store.toggleSubtask(child1.id)
    let updatedParent = store.subtasks.find((s: Subtask) => s.id === parent.id)
    expect(updatedParent?.completed).toBe(false)

    // Complete child 2
    await store.toggleSubtask(child2.id)
    updatedParent = store.subtasks.find((s: Subtask) => s.id === parent.id)
    expect(updatedParent?.completed).toBe(true)
  })

  it('reverse cascade: uncompleting a child uncompletes parent', async () => {
     const store = useTodoStore()
    const todo = await store.addTodoItem('Task')
    const parent = await store.addSubtask(todo.id, 'Parent')
    const child = await store.addSubtask(todo.id, 'Child', parent.id)

    // Complete parent (which completes child)
    await store.toggleSubtask(parent.id)

    // Uncomplete child
    await store.toggleSubtask(child.id)

    const updatedParent = store.subtasks.find((s: Subtask) => s.id === parent.id)
    expect(updatedParent?.completed).toBe(false)
  })
})
