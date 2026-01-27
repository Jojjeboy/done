<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, GitCommit, Clock, User, ExternalLink } from 'lucide-vue-next'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import type { CommitData } from '@/types/commit-info'

// Import the generated commit data
import commitData from '@/generated/commit-info.json'

const router = useRouter()
const { t } = useI18n()

const data = computed<CommitData>(() => commitData as CommitData)

// Format timestamp to relative time
const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return t('pwa.relativeTime.seconds', { n: diffInSeconds })
    if (diffInSeconds < 3600) return t('pwa.relativeTime.minutes', { n: Math.floor(diffInSeconds / 60) })
    if (diffInSeconds < 86400) return t('pwa.relativeTime.hours', { n: Math.floor(diffInSeconds / 3600) })
    if (diffInSeconds < 2592000) return t('pwa.relativeTime.days', { n: Math.floor(diffInSeconds / 86400) })
    if (diffInSeconds < 31536000) return t('pwa.relativeTime.months', { n: Math.floor(diffInSeconds / 2592000) })
    return t('pwa.relativeTime.years', { n: Math.floor(diffInSeconds / 31536000) })
}

// Format full date
const formatFullDate = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const getCommitUrl = (hash: string): string => {
    return `${data.value.repoUrl}/commit/${hash}`
}
</script>

<template>
    <div class="app-layout">
        <!-- Desktop Sidebar -->
        <div class="desktop-sidebar">
            <AppSidebar />
        </div>

        <!-- Main Content Area -->
        <main class="main-content">
            <div class="content-wrapper">
                <div class="changelog-view">
                    <div class="changelog-header">
                        <button @click="router.push('/settings')" class="back-button mobile-only"
                            :aria-label="t('common.back')">
                            <ArrowLeft :size="18" />
                        </button>
                        <h2 class="page-title">
                            {{ t('pwa.changelog') }}
                        </h2>
                    </div>

                    <p class="changelog-subtitle">{{ t('pwa.commitHistory') }}</p>

                    <!-- Empty State -->
                    <div v-if="!data.commits || data.commits.length === 0" class="empty-state">
                        <GitCommit :size="48" class="empty-icon" />
                        <p>{{ t('pwa.noCommitData') }}</p>
                    </div>

                    <!-- Timeline -->
                    <div v-else class="timeline">
                        <div v-for="(commit, index) in data.commits" :key="commit.hash" class="timeline-item"
                            :class="{ 'timeline-item-last': index === data.commits.length - 1 }">
                            <div class="timeline-marker">
                                <div class="timeline-dot">
                                    <GitCommit :size="16" />
                                </div>
                                <div v-if="index !== data.commits.length - 1" class="timeline-line"></div>
                            </div>

                            <div class="timeline-content">
                                <div class="commit-header">
                                    <h3 class="commit-message">{{ commit.message }}</h3>
                                    <a :href="getCommitUrl(commit.hash)" target="_blank" rel="noopener noreferrer"
                                        class="commit-link" :aria-label="`${t('pwa.viewOnGitHub')} ${commit.hash}`">
                                        <ExternalLink :size="16" />
                                    </a>
                                </div>

                                <div class="commit-meta">
                                    <div class="commit-meta-item">
                                        <Clock :size="14" />
                                        <span class="commit-time" :title="formatFullDate(commit.timestamp)">
                                            {{ formatRelativeTime(commit.timestamp) }}
                                        </span>
                                    </div>

                                    <div class="commit-meta-item">
                                        <User :size="14" />
                                        <span>{{ commit.author }}</span>
                                    </div>

                                    <div class="commit-meta-item">
                                        <code class="commit-hash">{{ commit.hash }}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile Bottom Nav -->
            <div class="mobile-only">
                <BottomNavigation />
            </div>
        </main>
    </div>
</template>

<style scoped>
.app-layout {
    display: flex;
    min-height: 100vh;
    background: var(--color-bg-lighter);
}

.dark .app-layout {
    background: var(--color-bg-light);
}

.desktop-sidebar {
    display: none;
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    position: relative;
}

.content-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);
    width: 100%;
}

.mobile-only {
    display: block;
}

.changelog-view {
    max-width: 700px;
    margin: 0 auto;
    padding-bottom: 5rem;
}

.changelog-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
}

.back-button {
    background: var(--color-bg-white);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    box-shadow: var(--shadow-md);
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
    box-shadow: var(--shadow-lg);
}

.page-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
}

.changelog-subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-xl);
}

@media (min-width: 769px) {
    .desktop-sidebar {
        display: block;
        flex-shrink: 0;
    }

    .mobile-only {
        display: none;
    }

    .content-wrapper {
        padding: var(--spacing-xl);
    }

    .changelog-view {
        margin-top: var(--spacing-2xl);
    }
}

/* Empty State */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-3xl);
    text-align: center;
    color: var(--color-text-muted);
}

.empty-icon {
    margin-bottom: var(--spacing-md);
    opacity: 0.5;
}

/* Timeline */
.timeline {
    position: relative;
    padding-top: var(--spacing-md);
}

.timeline-item {
    display: flex;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
}

.timeline-item-last {
    margin-bottom: 0;
}

.timeline-marker {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
}

.timeline-dot {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-white);
    box-shadow: var(--shadow-md);
    z-index: 1;
}

.timeline-line {
    width: 2px;
    flex: 1;
    background: var(--color-border);
    margin-top: var(--spacing-xs);
    min-height: 60px;
}

.dark .timeline-line {
    background: var(--color-bg-card);
}

.timeline-content {
    flex: 1;
    background: var(--color-bg-white);
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-base);
}

.dark .timeline-content {
    background: var(--color-bg-card);
}

.timeline-content:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
}

.commit-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
}

.commit-message {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    line-height: 1.5;
    flex: 1;
}

.commit-link {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    transition: all var(--transition-base);
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
}

.commit-link:hover {
    background: var(--color-bg-lavender);
    transform: scale(1.1);
}

.commit-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
}

.commit-meta-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
}

.commit-time {
    font-style: italic;
}

.commit-hash {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: var(--font-size-xs);
    background: var(--color-bg-lighter);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    color: var(--color-primary);
}

.dark .commit-hash {
    background: var(--color-bg-light);
}
</style>
