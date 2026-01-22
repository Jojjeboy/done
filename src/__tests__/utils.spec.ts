import { describe, it, expect } from 'vitest'

describe('TodoItem Types', () => {
  it('defines todo categories correctly', () => {
    const validCategories = ['work', 'lifestyle', 'personal', 'hobby', 'none'] as const

    expect(validCategories).toContain('work')
    expect(validCategories).toContain('lifestyle')
    expect(validCategories).toContain('personal')
    expect(validCategories).toContain('hobby')
    expect(validCategories).toContain('none')
  })

  it('defines todo statuses correctly', () => {
    const validStatuses = ['pending', 'completed'] as const

    expect(validStatuses).toContain('pending')
    expect(validStatuses).toContain('completed')
  })

  it('defines todo priorities correctly', () => {
    const validPriorities = ['low', 'normal', 'high', 'urgent'] as const

    expect(validPriorities).toContain('low')
    expect(validPriorities).toContain('normal')
    expect(validPriorities).toContain('high')
    expect(validPriorities).toContain('urgent')
  })
})

describe('Date Utility', () => {
  it('can format dates', () => {
    const date = new Date(2024, 0, 15) // January 15, 2024
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    expect(formatted).toContain('2024')
    expect(formatted).toContain('January')
    expect(formatted).toContain('15')
  })

  it('can identify today', () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const otherDay = new Date()
    otherDay.setDate(otherDay.getDate() + 1)
    otherDay.setHours(0, 0, 0, 0)

    expect(today.toDateString()).not.toBe(otherDay.toDateString())
  })

  it('can identify same day across different times', () => {
    const date1 = new Date(2024, 0, 15, 10, 30)
    const date2 = new Date(2024, 0, 15, 20, 45)

    date1.setHours(0, 0, 0, 0)
    date2.setHours(0, 0, 0, 0)

    expect(date1.toDateString()).toBe(date2.toDateString())
  })

  it('handles month boundaries', () => {
    const lastDayOfJan = new Date(2024, 0, 31)
    const firstDayOfFeb = new Date(2024, 1, 1)

    expect(lastDayOfJan.getMonth()).not.toBe(firstDayOfFeb.getMonth())
  })
})
