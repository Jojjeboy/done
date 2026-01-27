<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { useI18n } from 'vue-i18n'
import { BarChart, CheckCircle, List, AlertTriangle, ArrowLeft } from 'lucide-vue-next'

const todoStore = useTodoStore()
const { t } = useI18n()
const router = useRouter()

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

// Conic Gradient for Donut Chart
const donutChartStyle = computed(() => {
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
      <button @click="router.push('/')" class="back-button mobile-only" :aria-label="t('common.back')">
        <ArrowLeft :size="18" />
      </button>
      <h1 class="page-title">{{ t('stats.title') }}</h1>
    </header>

    <div class="stats-content">
      <div class="stats-grid">
        <!-- Key Metrics with Entrance Animations -->
        <div class="metric-card fade-in-up" style="animation-delay: 0.1s">
          <div class="metric-icon success">
            <CheckCircle :size="24" />
          </div>
          <div class="metric-content">
            <span class="metric-value">{{ completionRate }}%</span>
            <span class="metric-label">{{ t('stats.completionRate') }}</span>
          </div>
        </div>

        <div class="metric-card fade-in-up" style="animation-delay: 0.2s">
          <div class="metric-icon primary">
            <List :size="24" />
          </div>
          <div class="metric-content">
            <span class="metric-value">{{ completedTasks }}</span>
            <span class="metric-label">{{ t('stats.tasksCompleted') }}</span>
          </div>
        </div>

        <div class="metric-card fade-in-up" style="animation-delay: 0.3s" v-if="staleTasksCount > 0">
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
      <div class="chart-section fade-in-up" style="animation-delay: 0.4s" v-if="totalTasks > 0">
        <h2 class="section-title">{{ t('stats.categoryBreakdown') }}</h2>
        <div class="chart-container">
          <div class="chart-visual">
            <div class="donut-chart" :style="donutChartStyle">
              <div class="donut-hole">
                <span class="total-count">{{ totalTasks }}</span>
                <span class="total-label">Tasks</span>
              </div>
            </div>
          </div>
          <div class="chart-legend">
            <div v-for="cat in categoryStats" :key="cat.name" class="legend-item">
              <span class="legend-color" :style="{ background: cat.color }"></span>
              <div class="legend-info">
                <span class="legend-label">{{ cat.name }}</span>
                <span class="legend-percentage">{{ Math.round((cat.count / totalTasks) * 100) }}%</span>
              </div>
              <span class="legend-count">{{ cat.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state fade-in" style="animation-delay: 0.2s">
        <div class="empty-icon-wrapper">
          <BarChart :size="48" class="empty-icon" />
        </div>
        <p>{{ t('stats.emptyState') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-view {
  max-width: 540px;
  margin: 1rem;
  padding-bottom: 2rem;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-2xl);
}

.back-button {
  background: var(--color-bg-white);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  cursor: pointer;
  border: none;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .back-button {
  background: var(--color-bg-card);
}

.back-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: var(--color-text-primary);
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
}

.metric-card {
  background: var(--color-bg-white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dark .metric-card {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary-light);
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.metric-icon.primary {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.metric-icon.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}

.metric-content {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1;
}

.metric-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-top: 6px;
}

.chart-section {
  background: var(--color-bg-white);
  padding: var(--spacing-xl);
  border-radius: var(--radius-2xl);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

.dark .chart-section {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xl);
  letter-spacing: -0.01em;
}

.chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2xl);
}

.chart-visual {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  width: 100%;
}

.donut-chart {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
}

.donut-hole {
  width: 140px;
  height: 140px;
  background: var(--color-bg-white);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
  z-index: 2;
}

.dark .donut-hole {
  background: var(--color-bg-card);
}

.total-count {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--color-text-primary);
  line-height: 1;
}

.total-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.chart-legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-md);
  background: var(--color-bg-lighter);
  border-radius: var(--radius-lg);
  transition: all 0.2s ease;
}

.dark .legend-item {
  background: rgba(255, 255, 255, 0.03);
}

.legend-item:hover {
  background: var(--color-bg-lavender);
  transform: translateX(4px);
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.legend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.legend-label {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
}

.legend-percentage {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.legend-count {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--color-text-primary);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--color-bg-white);
  border-radius: var(--radius-2xl);
  border: 1px dashed var(--color-border);
}

.dark .empty-state {
  background: var(--color-bg-card);
}

.empty-icon-wrapper {
  width: 100px;
  height: 100px;
  background: var(--color-bg-lighter);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--spacing-xl);
}

.empty-icon {
  color: var(--color-text-muted);
}

.empty-state p {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-secondary);
}

/* Animations */
.fade-in-up {
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInUp 0.5s ease-out forwards;
}

.fade-in {
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .mobile-only {
    display: flex;
  }
}

@media (max-width: 600px) {
  .metric-card {
    padding: var(--spacing-lg);
  }

  .metric-value {
    font-size: 1.5rem;
  }

  .chart-section {
    padding: var(--spacing-lg);
  }
}
</style>
