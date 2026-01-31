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

// Project Breakdown
const projectStats = computed(() => {
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
    const project = todoStore.projectsById.get(id)
    if (project) {
      result.push({ name: project.title, count, color: project.color || '#ccc' })
    }
  })

  if (unclassified > 0) {
    result.push({ name: t('stats.unclassified'), count: unclassified, color: '#9ca3af' })
  }

  return result.sort((a, b) => b.count - a.count)
})

// Conic Gradient for Donut Chart
const donutChartStyle = computed(() => {
  let currentAngle = 0
  const total = totalTasks.value
  if (total === 0) return { background: '#e5e7eb' }

  const segments = projectStats.value.map(cat => {
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
      <div class="header-text">
        <h1 class="page-title">{{ t('stats.title') }}</h1>
        <p class="page-subtitle">{{ t('stats.overviewSubtitle', 'Ett snabbt översikt av dina framsteg') }}</p>
      </div>
    </header>

    <div class="stats-content">
      <!-- High-Level Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card success fade-in-up" style="animation-delay: 0.1s">
          <div class="metric-icon-box">
            <CheckCircle :size="20" />
          </div>
          <div class="metric-data">
            <span class="metric-label">{{ t('stats.completionRate') }}</span>
            <span class="metric-value">{{ completionRate }}%</span>
          </div>
          <div class="metric-progress-base">
            <div class="metric-progress-bar" :style="{ width: completionRate + '%' }"></div>
          </div>
        </div>

        <div class="metric-card primary fade-in-up" style="animation-delay: 0.2s">
          <div class="metric-icon-box">
            <List :size="20" />
          </div>
          <div class="metric-data">
            <span class="metric-label">{{ t('stats.tasksCompleted') }}</span>
            <span class="metric-value">{{ completedTasks }}</span>
          </div>
          <div class="metric-subtext">{{ t('stats.totalTasks', { count: totalTasks }) }}</div>
        </div>

        <div class="metric-card warning fade-in-up" style="animation-delay: 0.3s" v-if="staleTasksCount > 0">
          <div class="metric-icon-box">
            <AlertTriangle :size="20" />
          </div>
          <div class="metric-data">
            <span class="metric-label">{{ t('stats.staleTasks') }}</span>
            <span class="metric-value">{{ staleTasksCount }}</span>
          </div>
          <div class="metric-subtext">{{ t('stats.needsAttention', 'Behöver ses över') }}</div>
        </div>
      </div>

      <!-- Main Breakdown Section -->
      <div class="breakdown-wrapper fade-in-up" style="animation-delay: 0.4s" v-if="totalTasks > 0">
        <div class="breakdown-header">
          <h2 class="section-title text-gradient">{{ t('stats.projectBreakdown') }}</h2>
        </div>

        <div class="breakdown-container">
          <div class="chart-visual-wrapper">
            <div class="donut-chart" :style="donutChartStyle">
              <div class="donut-hole">
                <span class="total-count">{{ totalTasks }}</span>
                <span class="total-label">Totalt</span>
              </div>
            </div>
          </div>

          <div class="chart-legend-grid">
            <div v-for="cat in projectStats" :key="cat.name" class="legend-card" :style="{ '--cat-color': cat.color }">
              <div class="legend-top">
                <span class="legend-indicator"></span>
                <span class="legend-name">{{ cat.name }}</span>
                <span class="legend-count-val">{{ cat.count }}</span>
              </div>
              <div class="legend-track">
                <div class="legend-fill" :style="{ width: Math.round((cat.count / totalTasks) * 100) + '%' }"></div>
              </div>
              <div class="legend-bottom">
                <span class="legend-perc">{{ Math.round((cat.count / totalTasks) * 100) }}% av alla uppgifter</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state fade-in" style="animation-delay: 0.2s">
        <div class="empty-icon-wrapper">
          <BarChart :size="48" class="empty-icon" />
        </div>
        <p class="empty-text">{{ t('stats.emptyState') }}</p>
        <button @click="router.push('/')" class="btn-primary-ghost">
          {{ t('stats.getStarted', 'Börja lägga till uppgifter') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-view {
  max-width: 1200px;
  /* Wider for desktop */
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  margin-bottom: 3rem;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 850;
  color: var(--color-text-primary);
  letter-spacing: -0.03em;
}

.page-subtitle {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  margin-top: 4px;
}

.back-button {
  background: var(--color-bg-white);
  border-radius: var(--radius-lg);
  width: 44px;
  height: 44px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid var(--color-border-light);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .back-button {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.back-button:hover {
  transform: translateX(-4px);
  box-shadow: var(--shadow-md);
  color: var(--color-primary);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.metric-card {
  background: var(--color-bg-white);
  padding: 1.5rem;
  border-radius: 20px;
  border: 1px solid var(--color-border-light);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.dark .metric-card {
  background: var(--color-bg-card);
  border-color: var(--color-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.12);
}

.metric-icon-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.metric-card.success .metric-icon-box {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
}

.metric-card.primary .metric-icon-box {
  background: var(--color-bg-lavender);
  color: var(--color-primary);
}

.metric-card.warning .metric-icon-box {
  background: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}

.metric-data {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
}

.metric-label {
  font-size: 0.85rem;
  font-weight: 650;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.metric-value {
  font-size: 2.25rem;
  font-weight: 850;
  color: var(--color-text-primary);
  line-height: 1.1;
  margin: 4px 0;
}

.metric-subtext {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.metric-progress-base {
  height: 6px;
  background: var(--color-bg-lighter);
  border-radius: 3px;
  margin-top: auto;
  overflow: hidden;
}

.dark .metric-progress-base {
  background: rgba(255, 255, 255, 0.05);
}

.metric-progress-bar {
  height: 100%;
  background: #10B981;
  border-radius: 3px;
  transition: width 1s ease-out;
}

/* Breakdown Section */
.breakdown-wrapper {
  background: var(--color-bg-white);
  padding: 2rem;
  border-radius: 24px;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

.dark .breakdown-wrapper {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

.breakdown-header {
  margin-bottom: 2.5rem;
}

.text-gradient {
  background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.breakdown-container {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  align-items: center;
}

@media (min-width: 900px) {
  .breakdown-container {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.chart-visual-wrapper {
  flex-shrink: 0;
  padding: 1rem;
}

.donut-chart {
  width: 240px;
  height: 240px;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.donut-chart:hover {
  transform: scale(1.02);
}

.donut-hole {
  width: 170px;
  height: 170px;
  background: var(--color-bg-white);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.05);
  z-index: 2;
}

.dark .donut-hole {
  background: var(--color-bg-card);
}

.total-count {
  font-size: 3rem;
  font-weight: 900;
  color: var(--color-text-primary);
  line-height: 1;
}

.total-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.chart-legend-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
  width: 100%;
}

.legend-card {
  padding: 1.25rem;
  background: var(--color-bg-lighter);
  border-radius: 16px;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid transparent;
}

.dark .legend-card {
  background: rgba(255, 255, 255, 0.03);
}

.legend-card:hover {
  transform: scale(1.03);
  background: var(--color-bg-white);
  border-color: var(--cat-color);
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.08);
}

.dark .legend-card:hover {
  background: rgba(255, 255, 255, 0.07);
}

.legend-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.legend-indicator {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background-color: var(--cat-color);
  box-shadow: 0 0 8px var(--cat-color);
}

.legend-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  flex: 1;
}

.legend-count-val {
  font-weight: 850;
  color: var(--color-text-primary);
}

.legend-track {
  height: 4px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 2px;
  overflow: hidden;
}

.dark .legend-track {
  background: rgba(255, 255, 255, 0.05);
}

.legend-fill {
  height: 100%;
  background-color: var(--cat-color);
  border-radius: 2px;
}

.legend-bottom {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 6rem 2rem;
  background: var(--color-bg-white);
  border-radius: 32px;
  border: 2px dashed var(--color-border);
}

.dark .empty-state {
  background: var(--color-bg-card);
}

.empty-icon-wrapper {
  width: 120px;
  height: 120px;
  background: var(--color-bg-lavender);
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 2rem;
  color: var(--color-primary);
}

.empty-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 2rem;
}

.btn-primary-ghost {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  padding: 0.75rem 2rem;
  border-radius: var(--radius-full);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary-ghost:hover {
  background: var(--color-primary);
  color: white;
}

/* Animations */
.fade-in-up {
  opacity: 0;
  transform: translateY(30px);
  animation: fadeInUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

.fade-in {
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
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

@media (max-width: 768px) {
  .mobile-only {
    display: flex;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .breakdown-wrapper {
    padding: 1.25rem;
  }
}
</style>
