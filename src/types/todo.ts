/**
 * TypeScript interfaces for the hierarchical data model
 */

export interface Project {
  id: string
  title: string
  color: string
  createdAt: number
}

export interface TodoList {
  id: string
  projectId: string
  title: string
  createdAt: number
}

export interface TodoItem {
  id: string
  listId: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  deadline: number | null
  category: 'work' | 'lifestyle' | 'personal' | 'hobby' | 'none'
  createdAt: number
  updatedAt: number
}

export interface Subtask {
  id: string
  todoId: string
  title: string
  completed: boolean
}
