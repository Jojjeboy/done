/**
 * TypeScript interfaces for the simplified todo list app
 */

export interface Category {
  id: string
  title: string
  icon?: string
  color?: string
  isDefault?: boolean
  createdAt: number
  order: number
}

export interface TodoItem {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  deadline: number | null
  recurrence?: 'daily' | 'weekly' | 'monthly' | null
  categoryId: string | null
  createdAt: number
  updatedAt: number
}

export interface Subtask {
  id: string
  todoId: string
  title: string
  completed: boolean
  parentId?: string | null
  order: number
}

export interface Comment {
  id: string
  todoId: string
  text: string
  createdAt: number
  userId: string
}
