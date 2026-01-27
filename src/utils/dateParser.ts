/**
 * Simple NLP-like date parser for task titles
 * Supports patterns in both English and Swedish:
 * - "tomorrow" / "imorgon", "today" / "idag"
 * - "at 5pm" / "kl 17:00" / "klockan 5pm"
 * - "next friday" / "nästa fredag"
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

  // Regex Patterns for both English and Swedish
  const timeRegex = /\b(?:at|kl|klockan)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  const tomorrowRegex = /\b(tomorrow|imorgon)\b/i
  const todayRegex = /\b(today|idag)\b/i
  const nextDayRegex = /\b(?:next|nästa)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag)\b/i

  // Map Swedish weekdays to English for processing
  const swedishToEnglishDays: Record<string, string> = {
    'måndag': 'monday',
    'tisdag': 'tuesday',
    'onsdag': 'wednesday',
    'torsdag': 'thursday',
    'fredag': 'friday',
    'lördag': 'saturday',
    'söndag': 'sunday'
  }

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
      let dayName = nextDayMatch[1].toLowerCase()

      // Convert Swedish day to English if needed
      if (dayName in swedishToEnglishDays) {
        const englishDay = swedishToEnglishDays[dayName]
        if (englishDay) {
          dayName = englishDay
        }
      }

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const targetDay = days.indexOf(dayName)

      if (targetDay !== -1) {
        const currentDay = now.getDay()
        let daysToAdd = targetDay - currentDay
        if (daysToAdd <= 0) daysToAdd += 7
        targetDate.setDate(targetDate.getDate() + daysToAdd)
        matched = true
        cleanText = cleanText.replace(nextDayRegex, '')
      }
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
    // Let's keep current time if no time specified, or set to 12:00 if strictly date?
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
