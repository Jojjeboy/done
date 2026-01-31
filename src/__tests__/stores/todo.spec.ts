import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTodoStore } from '@/stores/todo'
import { setActivePinia, createPinia } from 'pinia'

// Mock the auth store to provide a dummy user
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { uid: 'test-user' }
  }))
}))

describe('Todo Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Todo Items', () => {
    it('initializes with empty todo items', () => {
      const store = useTodoStore()
      expect(Array.isArray(store.todoItems)).toBe(true)
    })

    it('has initialize method', () => {
      const store = useTodoStore()
      expect(typeof store.initialize).toBe('function')
    })
  })

  describe('Projects', () => {
    it('initializes with empty projects', () => {
      const store = useTodoStore()
      expect(Array.isArray(store.projects)).toBe(true)
    })

    it('can add a project', async () => {
      const store = useTodoStore()
      await store.addProject('New Project', '#000000')
      expect(store.projects.length).toBe(1)
      expect(store.projects[0].title).toBe('New Project')
    })

    it('can delete a project', async () => {
        const store = useTodoStore()
        const project = await store.addProject('To Delete')
        await store.deleteProject(project.id)
        expect(store.projects.length).toBe(0)
    })
  })

  describe('Store State', () => {
    it('has initialized flag', () => {
      const store = useTodoStore()
      expect(typeof store.initialized).toBe('boolean')
    })

    it('has loading flag', () => {
      const store = useTodoStore()
      expect(typeof store.loading).toBe('boolean')
    })
  })
})
