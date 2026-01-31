/**
 * TypeScript interfaces for the simplified todo list app
 */

export interface Project {
  id: string
  title: string
  icon?: string
  color?: string
  isDefault?: boolean
  createdAt: number
  order: number
  description?: string
  deadline?: number | null
  showProgress?: boolean // Default true
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
  isSticky?: boolean
  isSubtaskProcessEnabled?: boolean
}

export interface Subtask {
  id: string
  todoId: string
  title: string
  completed: boolean
  status?: 'pending' | 'in-progress' | 'completed'
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
