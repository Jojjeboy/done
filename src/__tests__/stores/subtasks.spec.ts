import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTodoStore } from '@/stores/todo'
import type { Subtask, TodoItem } from '@/types/todo'

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

  it('can reparent a subtask', async () => {
    const store = useTodoStore()
    const todo1 = await store.addTodoItem('Todo 1')
    const todo2 = await store.addTodoItem('Todo 2')
    const subtask = await store.addSubtask(todo1.id, 'Move me')

    await store.reparentSubtask(subtask.id, todo2.id)

    const updatedSubtask = store.subtasks.find((s: Subtask) => s.id === subtask.id)
    expect(updatedSubtask?.todoId).toBe(todo2.id)
    expect(store.subtasksByTodoId.get(todo1.id) || []).not.toContainEqual(expect.objectContaining({ id: subtask.id }))
    expect(store.subtasksByTodoId.get(todo2.id)).toContainEqual(expect.objectContaining({ id: subtask.id }))
  })

  it('can update subtasks order', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Todo')
    const s1 = await store.addSubtask(todo.id, 'S1')
    const s2 = await store.addSubtask(todo.id, 'S2')

    const reordered = [
      { ...s2, order: 0 },
      { ...s1, order: 1 }
    ] as Subtask[]

    await store.updateSubtasksOrder(reordered)

    const updatedS1 = store.subtasks.find((s: Subtask) => s.id === s1.id)
    const updatedS2 = store.subtasks.find((s: Subtask) => s.id === s2.id)
    expect(updatedS1?.order).toBe(1)
    expect(updatedS2?.order).toBe(0)
  })

  it('can convert a subtask to a todo', async () => {
    const store = useTodoStore()
    const todo = await store.addTodoItem('Todo')
    const subtask = await store.addSubtask(todo.id, 'Convert me')

    await store.convertSubtaskToTodo(subtask.id)

    expect(store.subtasks.find((s: Subtask) => s.id === subtask.id)).toBeUndefined()
    const newTodo = store.todoItems.find((t: TodoItem) => t.title === 'Convert me')
    expect(newTodo).toBeDefined()
    expect(newTodo?.parentId).toBeUndefined()
  })
})
