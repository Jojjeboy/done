<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  selectedDate: Date
}>()

const emit = defineEmits<{
  'update:selectedDate': [date: Date]
}>()

const selectedDate = computed({
  get: () => props.selectedDate,
  set: (value) => emit('update:selectedDate', value),
})

const today = new Date()
today.setHours(0, 0, 0, 0)

const weekDates = computed(() => {
  const dates: Date[] = []
  const startOfWeek = new Date(selectedDate.value)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Monday as first day
  startOfWeek.setDate(diff)

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    dates.push(date)
  }
  return dates
})

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const isToday = (date: Date) => {
  return date.toDateString() === today.toDateString()
}

const isSelected = (date: Date) => {
  return date.toDateString() === selectedDate.value.toDateString()
}

const selectDate = (date: Date) => {
  selectedDate.value = date
}

const formatDayNumber = (date: Date) => {
  return date.getDate().toString()
}
</script>

<template>
  <div class="date-picker">
    <div class="date-picker-header">
      <span class="current-month">{{ selectedDate.toLocaleDateString('en-US', { month: 'long' }) }}</span>
    </div>
    <div class="date-picker-week">
      <div
        v-for="(date, index) in weekDates"
        :key="date.toISOString()"
        class="date-item"
        :class="{ 'today': isToday(date), 'selected': isSelected(date) }"
        @click="selectDate(date)"
      >
        <div class="date-number">{{ formatDayNumber(date) }}</div>
        <div class="day-name">{{ dayNames[index] }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.date-picker {
  padding: 1rem 0;
  background: #ffffff;
}

.dark .date-picker {
  background: #1A1A1A;
}

.date-picker-header {
  padding: 0 1rem 0.75rem;
  font-weight: 600;
  font-size: 0.9375rem;
  color: #374151;
}

.dark .date-picker-header {
  color: #D1D5DB;
}

.date-picker-week {
  display: flex;
  gap: 0.5rem;
  padding: 0 1rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.date-picker-week::-webkit-scrollbar {
  display: none;
}

.date-item {
  flex: 1;
  min-width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0.5rem 0.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-item:hover {
  background-color: #F3F4F6;
}

.dark .date-item:hover {
  background-color: #2A2A2A;
}

.date-number {
  font-size: 1rem;
  font-weight: 600;
  color: #6B7280;
  transition: color 0.2s ease;
}

.dark .date-number {
  color: #9CA3AF;
}

.day-name {
  font-size: 0.75rem;
  color: #9CA3AF;
  text-transform: uppercase;
  transition: color 0.2s ease;
}

.dark .day-name {
  color: #6B7280;
}

.date-item.today .date-number,
.date-item.today .day-name {
  color: #10B981;
  font-weight: 700;
}

.date-item.selected {
  background-color: #10B981;
}

.date-item.selected .date-number,
.date-item.selected .day-name {
  color: #ffffff;
  font-weight: 700;
}

.date-item.selected.today {
  background-color: #10B981;
}
</style>
