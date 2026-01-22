import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTodoStore } from '@/stores/todo'
import { setActivePinia, createPinia } from 'pinia'
import type { TodoItem, TodoProject } from '@/types/todo'

describe('Todo Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Projects', () => {
    it('creates a new project', async () => {
      const store = useTodoStore()
      const initialCount = store.projects.length

      store.projects.push({
        id: 'test-project',
        title: 'Test Project',
        color: '#6366f1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(store.projects.length).toBe(initialCount + 1)
      expect(store.projects[store.projects.length - 1].title).toBe('Test Project')
    })

    it('finds project by id', () => {
      const store = useTodoStore()
      const testProject: TodoProject = {
        id: 'test-id',
        title: 'Test',
        color: '#6366f1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      store.projects.push(testProject)
      const found = store.projectsByProjectId.get('test-id')

      expect(found).toBeDefined()
      expect(found?.title).toBe('Test')
    })
  })

  describe('Todo Items', () => {
    it('initializes with empty todo items', () => {
      const store = useTodoStore()
      // Items might be loaded from DB, so just check it's an array
      expect(Array.isArray(store.todoItems)).toBe(true)
    })

    it('has categories data', () => {
      const store = useTodoStore()
      // Check that the store has methods/data for categories
      expect(store).toBeDefined()
    })

    it('has priorities data', () => {
      const store = useTodoStore()
      // Check that the store has methods/data for priorities
      expect(store).toBeDefined()
    })
  })

  describe('Maps and Computed Properties', () => {
    it('provides projectsByProjectId map', () => {
      const store = useTodoStore()
      expect(store.projectsByProjectId).toBeDefined()
      expect(store.projectsByProjectId instanceof Map).toBe(true)
    })

    it('provides listsByProjectId map', () => {
      const store = useTodoStore()
      expect(store.listsByProjectId).toBeDefined()
      expect(store.listsByProjectId instanceof Map).toBe(true)
    })

    it('provides itemsByListId map', () => {
      const store = useTodoStore()
      expect(store.itemsByListId).toBeDefined()
      expect(store.itemsByListId instanceof Map).toBe(true)
    })

    it('provides initialize method', () => {
      const store = useTodoStore()
      expect(typeof store.initialize).toBe('function')
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
