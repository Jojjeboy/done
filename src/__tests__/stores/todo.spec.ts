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

  describe('Categories', () => {
    it('initializes with empty categories', () => {
      const store = useTodoStore()
      expect(Array.isArray(store.categories)).toBe(true)
    })

    it('can add a category', async () => {
      const store = useTodoStore()
      await store.addCategory('New Category', '#000000')
      expect(store.categories.length).toBe(1)
      expect(store.categories[0].title).toBe('New Category')
    })

    it('can delete a category', async () => {
        const store = useTodoStore()
        const cat = await store.addCategory('To Delete')
        await store.deleteCategory(cat.id)
        expect(store.categories.length).toBe(0)
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
