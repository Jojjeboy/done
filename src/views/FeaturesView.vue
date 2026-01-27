<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, CheckCircle, Globe, Smartphone, Shield, Search } from 'lucide-vue-next'

const router = useRouter()
const { t } = useI18n()

const features = [
  {
    category: 'Task Management',
    icon: CheckCircle,
    items: [
      { title: 'Create & Edit', description: 'Easily add tasks with titles, descriptions, priorities, and deadlines.' },
      { title: 'Read/Edit Modes', description: 'Distraction-free reading view with a seamless toggle to edit mode.' },
      { title: 'Subtasks', description: 'Break down complex tasks into smaller, manageable subtasks. Supports one level of nesting.' },
      { title: 'Deadlines', description: 'Set due dates with a built-in datepicker.' },
      { title: 'Categories', description: 'Organize tasks into color-coded categories (Work, Personal, Hobby, Lifestyle).' },
      { title: 'Search', description: 'Fast, responsive search to find any task instantly.', icon: Search }
    ]
  },
  {
    category: 'User Experience',
    icon: Smartphone,
    items: [
      { title: 'PWA Support', description: 'Installable on mobile and desktop. Works fully offline.' },
      { title: 'Dynamic Greetings', description: 'Welcomes you based on your local time.' },
      { title: 'Dark Mode', description: 'Fully supported dark theme for all components.' },
      { title: 'Mobile First', description: 'Optimized for mobile use with bottom navigation.' }
    ]
  },
  {
    category: 'Technical',
    icon: Shield,
    items: [
      { title: 'State Management', description: 'Robust state handling with Pinia.' },
      { title: 'Persistence', description: 'IndexedDB integration for reliable offline storage.' },
      { title: 'Internationalization', description: 'Full support for English and Swedish.', icon: Globe }
    ]
  }
]
</script>

<template>
  <div class="features-view">
    <header class="header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="24" />
      </button>
      <h1 class="page-title">{{ t('common.features') }}</h1>
    </header>

    <div class="content">
      <div v-for="(section, idx) in features" :key="idx" class="feature-section">
        <div class="section-header">
          <component :is="section.icon" :size="24" class="section-icon" />
          <h2>{{ section.category }}</h2>
        </div>

        <div class="grid">
          <div v-for="(item, i) in section.items" :key="i" class="feature-card">
            <div class="card-icon">
              <component :is="item.icon || CheckCircle" :size="20" />
            </div>
            <div class="card-content">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.features-view {
  min-height: 100vh;
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  padding-bottom: var(--spacing-xxl);
}

.header {
  display: flex;
  align-items: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  position: sticky;
  top: 0;
  background-color: var(--color-bg-base); /* Ensure opacity */
  z-index: 10;
  border-bottom: 1px solid var(--color-border-light);
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  padding: var(--spacing-xs);
  border-radius: 50%;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: var(--color-bg-lighter);
}

.page-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 700;
}

.content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.feature-section {
  margin-bottom: var(--spacing-xl);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  color: var(--color-primary);
}

.section-icon {
  color: var(--color-primary);
}

.section-header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.feature-card {
  background-color: var(--color-bg-card);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  display: flex;
  gap: var(--spacing-md);
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-icon {
  color: var(--color-primary);
  flex-shrink: 0;
  padding-top: 2px;
}

.card-content h3 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-md);
  font-weight: 600;
}

.card-content p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
