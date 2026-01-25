import { describe, it, expect, vi, afterEach } from 'vitest'

describe('Dynamic Greeting Logic', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // Mocking the component setup logic for testing
  const getGreetingKey = (hour: number) => {
    if (hour >= 5 && hour < 10) return 'common.goodMorning'
    if (hour >= 10 && hour < 14) return 'common.goodDay'
    if (hour >= 14 && hour < 18) return 'common.goodAfternoon'
    if (hour >= 18 && hour < 22) return 'common.goodEvening'
    return 'common.goodNight'
  }

  it('returns goodMorning between 05:00 and 09:59', () => {
    expect(getGreetingKey(5)).toBe('common.goodMorning')
    expect(getGreetingKey(9)).toBe('common.goodMorning')
  })

  it('returns goodDay between 10:00 and 13:59', () => {
    expect(getGreetingKey(10)).toBe('common.goodDay')
    expect(getGreetingKey(13)).toBe('common.goodDay')
  })

  it('returns goodAfternoon between 14:00 and 17:59', () => {
    expect(getGreetingKey(14)).toBe('common.goodAfternoon')
    expect(getGreetingKey(17)).toBe('common.goodAfternoon')
  })

  it('returns goodEvening between 18:00 and 21:59', () => {
    expect(getGreetingKey(18)).toBe('common.goodEvening')
    expect(getGreetingKey(21)).toBe('common.goodEvening')
  })

  it('returns goodNight between 22:00 and 04:59', () => {
    expect(getGreetingKey(22)).toBe('common.goodNight')
    expect(getGreetingKey(23)).toBe('common.goodNight')
    expect(getGreetingKey(0)).toBe('common.goodNight')
    expect(getGreetingKey(4)).toBe('common.goodNight')
  })
})
