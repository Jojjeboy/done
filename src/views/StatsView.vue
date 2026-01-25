<script setup lang="ts">
import { computed } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { BarChart, CheckCircle, List, AlertTriangle } from 'lucide-vue-next'

const todoStore = useTodoStore()
const { t } = useI18n()

// Metrics
const totalTasks = computed(() => todoStore.todoItems.length)
const completedTasks = computed(() => todoStore.todoItems.filter(t => t.status === 'completed').length)
const completionRate = computed(() => {
  return totalTasks.value > 0 ? Math.round((completedTasks.value / totalTasks.value) * 100) : 0
})

const staleTasksCount = computed(() => {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
  return todoStore.todoItems.filter(t => t.status === 'pending' && t.updatedAt < thirtyDaysAgo).length
})

// Category Breakdown
const categoryStats = computed(() => {
  const stats = new Map<string, number>()
  let unclassified = 0

  todoStore.todoItems.forEach(t => {
    if (t.categoryId) {
      stats.set(t.categoryId, (stats.get(t.categoryId) || 0) + 1)
    } else {
      unclassified++
    }
  })

  const result = []
  stats.forEach((count, id) => {
    const category = todoStore.categoriesById.get(id)
    if (category) {
      result.push({ name: category.title, count, color: category.color || '#ccc' })
    }
  })

  if (unclassified > 0) {
    result.push({ name: t('stats.uncategorized'), count: unclassified, color: '#9ca3af' })
  }

  return result.sort((a, b) => b.count - a.count)
})

// Conic Gradient for Pie Chart
const pieChartStyle = computed(() => {
  let currentAngle = 0
  const total = totalTasks.value
  if (total === 0) return { background: '#e5e7eb' }

  const segments = categoryStats.value.map(cat => {
    const percentage = cat.count / total
    const degrees = percentage * 360
    const start = currentAngle
    currentAngle += degrees
    return `${cat.color} ${start}deg ${currentAngle}deg`
  })

  return {
    background: `conic-gradient(${segments.join(', ')})`
  }
})

</script>

<template>
  <div class="stats-view">
    <header class="stats-header">
      <h1 class="page-title">{{ t('stats.title') }}</h1>
    </header>

    <div class="stats-grid">
      <!-- Key Metrics -->
      <div class="metric-card">
        <div class="metric-icon success">
          <CheckCircle :size="24" />
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ completionRate }}%</span>
          <span class="metric-label">{{ t('stats.completionRate') }}</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon primary">
          <List :size="24" />
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ completedTasks }}</span>
          <span class="metric-label">{{ t('stats.tasksCompleted') }}</span>
        </div>
      </div>

      <div class="metric-card" v-if="staleTasksCount > 0">
        <div class="metric-icon warning">
          <AlertTriangle :size="24" />
        </div>
        <div class="metric-content">
          <span class="metric-value">{{ staleTasksCount }}</span>
          <span class="metric-label">{{ t('stats.staleTasks') }}</span>
        </div>
      </div>
    </div>

    <!-- Category Chart -->
    <div class="chart-section" v-if="totalTasks > 0">
      <h2 class="section-title">{{ t('stats.categoryBreakdown') }}</h2>
      <div class="chart-container">
        <div class="pie-chart" :style="pieChartStyle"></div>
        <div class="chart-legend">
          <div v-for="cat in categoryStats" :key="cat.name" class="legend-item">
            <span class="legend-color" :style="{ background: cat.color }"></span>
            <span class="legend-label">{{ cat.name }}</span>
            <span class="legend-count">{{ cat.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <BarChart :size="48" class="empty-icon" />
      <p>{{ t('stats.emptyState') }}</p>
    </div>
  </div>
</template>

<style scoped>
.stats-view {
  padding: 0;
  max-width: 800px;
  margin: 0 auto;
}

.stats-header {
  margin-bottom: var(--spacing-2xl);
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.metric-card {
  background: var(--color-bg-white);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s;
}

.dark .metric-card {
  background: var(--color-bg-card);
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon.success { background: rgba(16, 185, 129, 0.1); color: #10B981; }
.metric-icon.primary { background: var(--color-bg-lavender); color: var(--color-primary); }
.metric-icon.warning { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }

.metric-content {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  line-height: 1;
}

.metric-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.chart-section {
  background: var(--color-bg-white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--color-border-light);
}

.dark .chart-section {
  background: var(--color-bg-card);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.chart-container {
  display: flex;
  align-items: center;
  gap: var(--spacing-2xl);
  flex-wrap: wrap;
  justify-content: center; /* Center content on smaller screens */
}

.pie-chart {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  position: relative;
  /* Optional hole for donut chart effect */
  /* mask: radial-gradient(white 50%, transparent 51%); */
}

.chart-legend {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.legend-label {
  flex: 1;
  color: var(--color-text-primary);
}

.legend-count {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-muted);
}

.empty-icon {
  margin-bottom: var(--spacing-md);
  color: var(--color-text-muted);
}

@media (max-width: 600px) {
    .chart-container {
        flex-direction: column;
        align-items: flex-start;
    }
    .pie-chart {
        align-self: center;
    }
}
</style>
