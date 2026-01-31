<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Monitor, Globe, Database, Settings as SettingsIcon, User as UserIcon, ChevronDown, ChevronRight } from 'lucide-vue-next'
import AppSidebar from '@/components/AppSidebar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useI18nStore } from '@/stores/i18n'
import { useSettingsStore } from '@/stores/settings'
import { getDatabase } from '@/db'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const i18nStore = useI18nStore()
const settingsStore = useSettingsStore()

// Screen Information
const screenInfo = ref({
    width: window.innerWidth,
    height: window.innerHeight,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    pixelRatio: window.devicePixelRatio,
    colorDepth: window.screen.colorDepth,
    orientation: window.screen.orientation?.type || 'unknown'
})

// Browser Information
const browserInfo = computed(() => {
    const ua = navigator.userAgent
    let browserName = 'Unknown'
    let browserVersion = 'Unknown'

    if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox'
        browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown'
    } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
        browserName = 'Opera'
        browserVersion = ua.match(/OPR\/([0-9.]+)/)?.[1] || 'Unknown'
    } else if (ua.indexOf('Edg') > -1) {
        browserName = 'Edge'
        browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown'
    } else if (ua.indexOf('Chrome') > -1) {
        browserName = 'Chrome'
        browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown'
    } else if (ua.indexOf('Safari') > -1) {
        browserName = 'Safari'
        browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown'
    }

    return {
        name: browserName,
        version: browserVersion,
        userAgent: ua,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
    }
})

// Database Statistics
const dbStats = ref({
    todos: 0,
    projects: 0,
    subtasks: 0,
    comments: 0,
    settings: 0
})

const loadDbStats = async () => {
    try {
        const db = getDatabase()
        dbStats.value = {
            todos: await db.table('todoItems').count(),
            projects: await db.table('categories').count(),
            subtasks: await db.table('subtasks').count(),
            comments: await db.table('comments').count(),
            settings: await db.table('settings').count()
        }
    } catch (error) {
        console.error('Error loading DB stats:', error)
    }
}

// Current Settings
const currentSettings = computed(() => ({
    theme: themeStore.theme,
    colorPalette: themeStore.colorPalette,
    locale: i18nStore.locale,
    threeStepEnabled: settingsStore.isThreeStepEnabled,
    focusModeTaskCount: settingsStore.focusModeTaskIds.length
}))

// Authentication Status
const authStatus = computed(() => ({
    authenticated: !!authStore.user,
    userId: authStore.user?.uid || 'N/A',
    email: authStore.user?.email || 'N/A',
    displayName: authStore.user?.displayName || 'N/A'
}))

// Sync Log with detailed before/after data
const syncLog = ref<Array<{
    timestamp: string
    action: string
    type: string
    key: string
    before: unknown
    after: unknown
    expanded: boolean
}>>([])

// Simulate some sync log entries with actual data for demo
const initSyncLog = () => {
    const entries = [
        {
            type: 'setting',
            key: 'theme',
            before: 'dark',
            after: 'light'
        },
        {
            type: 'todo',
            key: 'task-abc123',
            before: { title: 'Buy groceries', completed: false, priority: 'medium' },
            after: { title: 'Buy groceries', completed: true, priority: 'medium' }
        },
        {
            type: 'setting',
            key: 'locale',
            before: 'en',
            after: 'sv'
        },
        {
            type: 'project',
            key: 'project-xyz789',
            before: { title: 'Work Tasks', color: '#6c5ce7', taskCount: 5 },
            after: { title: 'Work Projects', color: '#6c5ce7', taskCount: 6 }
        },
        {
            type: 'subtask',
            key: 'subtask-def456',
            before: { title: 'Review code', status: 'todo' },
            after: { title: 'Review code', status: 'done' }
        },
        {
            type: 'setting',
            key: 'colorPalette',
            before: 'purple',
            after: 'blue'
        },
        {
            type: 'todo',
            key: 'task-ghi789',
            before: null,
            after: { title: 'New task created', completed: false, priority: 'high' }
        },
        {
            type: 'comment',
            key: 'comment-jkl012',
            before: { text: 'This is important' },
            after: { text: 'This is very important!' }
        },
    ]

    entries.forEach((entry, idx) => {
        const timestamp = new Date()
        timestamp.setMinutes(timestamp.getMinutes() - idx * 5)
        syncLog.value.push({
            timestamp: timestamp.toISOString(),
            action: entry.before === null ? 'created' : 'updated',
            type: entry.type,
            key: entry.key,
            before: entry.before,
            after: entry.after,
            expanded: false
        })
    })
}

const toggleExpand = (index: number) => {
    const entry = syncLog.value[index]
    if (entry) {
        entry.expanded = !entry.expanded
    }
}

onMounted(() => {
    loadDbStats()
    initSyncLog()

    // Update screen info on resize
    window.addEventListener('resize', () => {
        screenInfo.value = {
            width: window.innerWidth,
            height: window.innerHeight,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            pixelRatio: window.devicePixelRatio,
            colorDepth: window.screen.colorDepth,
            orientation: window.screen.orientation?.type || 'unknown'
        }
    })
})

const formatTimestamp = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleString()
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
                <div class="debug-view">
                    <div class="debug-header">
                        <button @click="router.push('/settings')" class="back-button mobile-only"
                            :aria-label="t('common.back')">
                            <ArrowLeft :size="18" />
                        </button>
                        <h2 class="page-title">Debug Information</h2>
                    </div>

                    <!-- Screen Information -->
                    <div class="debug-section">
                        <div class="section-header">
                            <Monitor :size="18" />
                            <h3>Screen Information</h3>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Window Size:</span>
                                <span class="info-value">{{ screenInfo.width }} × {{ screenInfo.height }}px</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Screen Size:</span>
                                <span class="info-value">{{ screenInfo.availWidth }} × {{ screenInfo.availHeight
                                    }}px</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Pixel Ratio:</span>
                                <span class="info-value">{{ screenInfo.pixelRatio }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Color Depth:</span>
                                <span class="info-value">{{ screenInfo.colorDepth }}-bit</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Orientation:</span>
                                <span class="info-value">{{ screenInfo.orientation }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Browser Information -->
                    <div class="debug-section">
                        <div class="section-header">
                            <Globe :size="18" />
                            <h3>Browser Information</h3>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Browser:</span>
                                <span class="info-value">{{ browserInfo.name }} {{ browserInfo.version }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Platform:</span>
                                <span class="info-value">{{ browserInfo.platform }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Language:</span>
                                <span class="info-value">{{ browserInfo.language }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Cookies:</span>
                                <span class="info-value">{{ browserInfo.cookiesEnabled ? 'Enabled' : 'Disabled'
                                    }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Online:</span>
                                <span class="info-value">{{ browserInfo.onLine ? 'Yes' : 'No' }}</span>
                            </div>
                            <div class="info-item full-width">
                                <span class="info-label">User Agent:</span>
                                <span class="info-value code">{{ browserInfo.userAgent }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Database Statistics -->
                    <div class="debug-section">
                        <div class="section-header">
                            <Database :size="18" />
                            <h3>Database Statistics</h3>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Tasks:</span>
                                <span class="info-value">{{ dbStats.todos }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Projects:</span>
                                <span class="info-value">{{ dbStats.projects }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Subtasks:</span>
                                <span class="info-value">{{ dbStats.subtasks }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Comments:</span>
                                <span class="info-value">{{ dbStats.comments }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Settings:</span>
                                <span class="info-value">{{ dbStats.settings }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Current Settings -->
                    <div class="debug-section">
                        <div class="section-header">
                            <SettingsIcon :size="18" />
                            <h3>Current Settings</h3>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Theme:</span>
                                <span class="info-value">{{ currentSettings.theme }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Color Palette:</span>
                                <span class="info-value">{{ currentSettings.colorPalette }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Language:</span>
                                <span class="info-value">{{ currentSettings.locale }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Three-Step Mode:</span>
                                <span class="info-value">{{ currentSettings.threeStepEnabled ? 'Enabled' : 'Disabled'
                                    }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Focus Mode Tasks:</span>
                                <span class="info-value">{{ currentSettings.focusModeTaskCount }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Authentication Status -->
                    <div class="debug-section">
                        <div class="section-header">
                            <UserIcon :size="18" />
                            <h3>Authentication Status</h3>
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Authenticated:</span>
                                <span class="info-value">{{ authStatus.authenticated ? 'Yes' : 'No' }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">User ID:</span>
                                <span class="info-value code">{{ authStatus.userId }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Email:</span>
                                <span class="info-value">{{ authStatus.email }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Display Name:</span>
                                <span class="info-value">{{ authStatus.displayName }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Recent Sync Log -->
                    <div class="debug-section">
                        <div class="section-header">
                            <Database :size="18" />
                            <h3>Recent Sync Activity</h3>
                        </div>
                        <div class="sync-log">
                            <div v-if="syncLog.length === 0" class="empty-log">
                                No sync activity recorded
                            </div>
                            <div v-else class="log-entries">
                                <div v-for="(entry, idx) in syncLog" :key="idx" class="log-entry-wrapper">
                                    <div class="log-entry" @click="toggleExpand(idx)">
                                        <span class="log-timestamp">{{ formatTimestamp(entry.timestamp) }}</span>
                                        <span class="log-action" :class="`action-${entry.action}`">{{ entry.action
                                        }}</span>
                                        <span class="log-type" :class="`type-${entry.type}`">{{ entry.type }}</span>
                                        <code class="log-key">{{ entry.key }}</code>
                                        <div class="expand-icon" :class="{ 'expanded': entry.expanded }">
                                            <ChevronDown v-if="entry.expanded" :size="16" />
                                            <ChevronRight v-else :size="16" />
                                        </div>
                                    </div>
                                    <div v-if="entry.expanded" class="log-details">
                                        <div class="detail-section">
                                            <div class="detail-label">Before:</div>
                                            <pre
                                                class="detail-value">{{ entry.before === null ? 'N/A (new item)' : JSON.stringify(entry.before, null, 2) }}</pre>
                                        </div>
                                        <div class="detail-section">
                                            <div class="detail-label">After:</div>
                                            <pre class="detail-value">{{ JSON.stringify(entry.after, null, 2) }}</pre>
                                        </div>
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

    .debug-view {
        margin-top: var(--spacing-2xl);
    }
}

.debug-view {
    max-width: 1000px;
    margin: 0 auto;
    padding-bottom: 5rem;
}

.debug-header {
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

.debug-section {
    background: var(--color-bg-white);
    border-radius: var(--radius-xl);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border-light);
}

.dark .debug-section {
    background: var(--color-bg-card);
    border-color: var(--color-border);
}

.section-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    color: var(--color-primary);
}

.section-header h3 {
    font-size: var(--font-size-lg);
    font-weight: 700;
    margin: 0;
}

.info-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
}

@media (min-width: 640px) {
    .info-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .info-item.full-width {
        grid-column: 1 / -1;
    }
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.info-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.info-value {
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
    word-break: break-word;
}

.info-value.code {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: var(--font-size-xs);
    background: var(--color-bg-lighter);
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    color: var(--color-primary);
}

.dark .info-value.code {
    background: var(--color-bg-light);
}

/* Sync Log */
.sync-log {
    max-height: 600px;
    overflow-y: auto;
}

.empty-log {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-muted);
    font-style: italic;
}

.log-entries {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
}

.log-entry-wrapper {
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.dark .log-entry-wrapper {
    border-color: var(--color-border);
}

.log-entry {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-lighter);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background var(--transition-base);
}

.log-entry:hover {
    background: var(--color-bg-white);
}

.dark .log-entry {
    background: var(--color-bg-light);
}

.dark .log-entry:hover {
    background: var(--color-bg-card);
}

.log-timestamp {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    min-width: 150px;
}

.log-action {
    font-weight: 600;
    text-transform: capitalize;
    min-width: 80px;
}

.log-action.action-created {
    color: var(--color-success);
}

.log-action.action-updated {
    color: var(--color-primary);
}

.log-type {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    text-transform: capitalize;
    min-width: 80px;
    text-align: center;
}

.log-type.type-setting {
    background: rgba(108, 92, 231, 0.15);
    color: var(--color-primary);
}

.log-type.type-todo {
    background: rgba(34, 197, 94, 0.15);
    color: var(--color-success);
}

.log-type.type-project {
    background: rgba(249, 115, 22, 0.15);
    color: #f97316;
}

.log-type.type-subtask {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
}

.log-type.type-comment {
    background: rgba(236, 72, 153, 0.15);
    color: #ec4899;
}

.log-key {
    font-family: 'Monaco', 'Courier New', monospace;
    background: var(--color-bg-white);
    color: var(--color-text-primary);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border-light);
    flex: 1;
}

.dark .log-key {
    background: var(--color-bg-card);
    border-color: var(--color-border);
}

.expand-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transition: transform var(--transition-base), color var(--transition-base);
    margin-left: auto;
}

.expand-icon.expanded {
    color: var(--color-primary);
}

.log-details {
    padding: var(--spacing-md);
    background: var(--color-bg-white);
    border-top: 1px solid var(--color-border-light);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.dark .log-details {
    background: var(--color-bg-card);
    border-color: var(--color-border);
}

.detail-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

.detail-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
}

.detail-value {
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: var(--font-size-xs);
    background: var(--color-bg-lighter);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    margin: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
}

.dark .detail-value {
    background: var(--color-bg-light);
}
</style>
