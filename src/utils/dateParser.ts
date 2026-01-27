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

  // 1. Specific Time Patterns (Tonight / Ikväll)
  const tonightRegex = /\b(tonight|ikväll)\b/i
  if (tonightRegex.test(input)) {
    targetDate.setHours(20, 0, 0, 0)
    matched = true
    cleanText = cleanText.replace(tonightRegex, '')
  }

  // 2. Relative Days Patterns (Tomorrow / Today / Next Week etc)
  const tomorrowRegex = /\b(tomorrow|imorgon)\b/i
  const todayRegex = /\b(today|idag)\b/i
  const inXDaysRegex = /\b(?:in|om)\s+(\d+)\s+(?:days|dagar)\b/i

  if (!matched) {
    if (tomorrowRegex.test(input)) {
        targetDate.setDate(targetDate.getDate() + 1)
        matched = true
        cleanText = cleanText.replace(tomorrowRegex, '')
    } else if (todayRegex.test(input)) {
        matched = true
        cleanText = cleanText.replace(todayRegex, '')
    } else {
        const inMatch = input.match(inXDaysRegex)
        if (inMatch && inMatch[1]) {
            const days = parseInt(inMatch[1])
            targetDate.setDate(targetDate.getDate() + days)
            matched = true
            cleanText = cleanText.replace(inXDaysRegex, '')
        }
    }
  }

  // 3. Weekday Patterns
  const swedishToEnglishDays: Record<string, string> = {
    'måndag': 'monday', 'tisdag': 'tuesday', 'onsdag': 'wednesday',
    'torsdag': 'thursday', 'fredag': 'friday', 'lördag': 'saturday', 'söndag': 'sunday',
    'mån': 'monday', 'tis': 'tuesday', 'ons': 'wednesday', 'tor': 'thursday', 'fre': 'friday', 'lör': 'saturday', 'sön': 'sunday'
  }

  const daysArr = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const weekdayRegex = /\b(?:next|nästa)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|måndag|tisdag|onsdag|torsdag|fredag|lördag|söndag|mån|tis|ons|tor|fre|lör|sön)\b/i

  if (!matched) {
      const dayMatch = input.match(weekdayRegex)
      if (dayMatch && dayMatch[1]) {
          let dayName = dayMatch[1].toLowerCase()
          if (dayName in swedishToEnglishDays) {
              const mapped = swedishToEnglishDays[dayName]
              if (mapped) dayName = mapped
          }

          const targetDay = daysArr.indexOf(dayName)
          if (targetDay !== -1) {
              const currentDay = now.getDay()
              let daysToAdd = targetDay - currentDay
              if (daysToAdd <= 0) daysToAdd += 7
              targetDate.setDate(targetDate.getDate() + daysToAdd)
              matched = true
              cleanText = cleanText.replace(weekdayRegex, '')
          }
      }
  }

  // 4. Fixed Date Patterns (e.g. 5 June, 12 dec)
  const monthMap: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
      'januari': 0, 'februari': 1, 'mars': 2, 'april': 3, 'maj': 4, 'juni': 5, 'juli': 6, 'augusti': 7, 'september': 8, 'oktober': 9, 'november': 10, 'december': 11
  }
  const dateRegex = /\b(?:on|den)?\s*(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|maj|jun|jul|aug|sep|oct|nov|dec|januari|februari|mars|april|juni|juli|augusti|oktober|november|december)\b/i

  if (!matched) {
      const dateMatch = input.match(dateRegex)
      if (dateMatch && dateMatch[1] && dateMatch[2]) {
          const day = parseInt(dateMatch[1])
          const monthStr = dateMatch[2].toLowerCase()
          const month = monthMap[monthStr]
          if (month !== undefined) {
              targetDate.setMonth(month)
              targetDate.setDate(day)
              // If date is in the past, assume next year?
              if (targetDate.getTime() < now.getTime() - 86400000) {
                  targetDate.setFullYear(targetDate.getFullYear() + 1)
              }
              matched = true
              cleanText = cleanText.replace(dateRegex, '')
          }
      }
  }

  // 5. Time Patterns
  const timeRegex = /\b(?:at|kl|klockan|kl\.)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  const timeMatch = input.match(timeRegex)
  if (timeMatch && timeMatch[1]) {
    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null

    if (period === 'pm' && hours < 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    if (!period && hours < 7 && matched) hours += 12

    targetDate.setHours(hours, minutes, 0, 0)
    matched = true
    cleanText = cleanText.replace(timeRegex, '')
  }

  if (!matched) return null

  // Cleanup extra spaces and common leftover words
  cleanText = cleanText.replace(/\b(vid)\b/gi, '')
  cleanText = cleanText.replace(/\s+/g, ' ').trim()

  return {
    text: cleanText || input,
    date: targetDate.getTime()
  }
}
