<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Home, ArrowLeft, Ghost } from 'lucide-vue-next'

const router = useRouter()
const { t } = useI18n()

// Assuming these translation keys might not exist yet, I'll use hardcoded strings for now
// or common keys if available. I will add proper i18n keys later if needed.
// For now, I'll use placeholders that look like i18n keys but fallback to text where possible
// if I was using a full i18n solution, but here I'll stick to a mix or add keys.
// Actually, safer to add keys to en.json first? No, I'll just use text for the 404 specific parts
// and common keys for buttons.
</script>

<template>
  <div class="not-found-container">
    <div class="content">
      <div class="icon-wrapper">
        <Ghost :size="64" class="ghost-icon" />
      </div>

      <h1 class="title">404</h1>
      <h2 class="subtitle">{{ t('error.notFound') }}</h2>

      <p class="description">
        {{ t('error.notFoundDesc') }}
      </p>

      <div class="actions">
        <button class="btn btn-secondary" @click="router.back()">
          <ArrowLeft :size="18" />
          <span>{{ t('common.back') }}</span>
        </button>

        <button class="btn btn-primary" @click="router.push('/')">
          <Home :size="18" />
          <span>{{ t('common.home') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
  text-align: center;
}

.content {
  max-width: 400px;
  animation: fadeIn 0.5s ease-out;
}

.icon-wrapper {
  margin-bottom: var(--spacing-lg);
  display: flex;
  justify-content: center;
}

.ghost-icon {
  color: var(--color-text-muted);
  animation: float 3s ease-in-out infinite;
}

.title {
  font-size: 4rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, var(--color-primary), var(--color-text-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.subtitle {
  font-size: 1.5rem;
  font-weight: 600;
  margin: var(--spacing-sm) 0 var(--spacing-md);
  color: var(--color-text-primary);
}

.description {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: var(--color-bg-lighter);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-bg-white);
  transform: translateY(-2px);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
