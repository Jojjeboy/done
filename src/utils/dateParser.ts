/**
 * Simple NLP-like date parser for task titles
 * Supports patterns like:
 * - "tomorrow" / "today"
 * - "at 5pm" / "at 17:00"
 * - "next friday"
 */

export interface DateParseResult {
  text: string // The cleaned text (original without the date part)
  date: number | null // The parsed timestamp
}

export const parseDateFromText = (input: string): DateParseResult | null => {
  const now = new Date()
  const targetDate = new Date(now)
  let matched = false
  let cleanText = input

  // Regex Patterns
  const timeRegex = /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  const tomorrowRegex = /\btomorrow\b/i
  const todayRegex = /\btoday\b/i
  const nextDayRegex = /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i

  // 1. Check for Days
  if (tomorrowRegex.test(input)) {
    targetDate.setDate(targetDate.getDate() + 1)
    matched = true
    cleanText = cleanText.replace(tomorrowRegex, '')
  } else if (todayRegex.test(input)) {
    matched = true
    cleanText = cleanText.replace(todayRegex, '')
  } else {
    const nextDayMatch = input.match(nextDayRegex)
    if (nextDayMatch && nextDayMatch[1]) {
      const dayName = nextDayMatch[1].toLowerCase()
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const targetDay = days.indexOf(dayName)
      const currentDay = now.getDay()
      let daysToAdd = targetDay - currentDay
      if (daysToAdd <= 0) daysToAdd += 7
      targetDate.setDate(targetDate.getDate() + daysToAdd)
      matched = true
      cleanText = cleanText.replace(nextDayRegex, '')
    }
  }

  // 2. Check for Time
  const timeMatch = input.match(timeRegex)
  if (timeMatch && timeMatch[1]) {
    matched = true
    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null

    if (period === 'pm' && hours < 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0

    targetDate.setHours(hours, minutes, 0, 0)
    cleanText = cleanText.replace(timeRegex, '')
  } else if (matched) {
    // Default to End of Day if only date matched? Or 9am?
    // Let's keep current time or default to 12:00 if strictly date?
    // For "tomorrow", user likely wants a due date.
    // Let's preserve current time if no time specified, or set to 9am?
    // Let's keep it simple: matches preserve current time if no time specified.
  }

  if (!matched) return null

  // Cleanup extra spaces
  cleanText = cleanText.replace(/\s+/g, ' ').trim()

  return {
    text: cleanText,
    date: targetDate.getTime()
  }
}
