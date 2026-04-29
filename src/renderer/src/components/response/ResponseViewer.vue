<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'
import { FullScreen } from '@element-plus/icons-vue'
import ResponseMeta from './ResponseMeta.vue'
import ResponseBody from './ResponseBody.vue'
import ResponseHeaders from './ResponseHeaders.vue'
import ResponseCookies from './ResponseCookies.vue'
import ResponseScripts from './ResponseScripts.vue'

const { t } = useI18n()
const response = useResponseStore()
const activeTab = ref('response')
const isFullscreen = ref(false)

const hasScriptReport = computed(() => Boolean(response.data?.scriptReport || response.error?.scriptReport))
const showRequestError = computed(() => Boolean(response.error && !hasScriptReport.value))

const tabs = computed(() => {
  const items = [] as Array<{ key: string; label: string }>

  if (response.data) {
    items.push({ key: 'response', label: t('response.body') })
    items.push({ key: 'headers', label: t('response.headers') })
    items.push({ key: 'cookies', label: t('response.cookies') })
  }

  if (hasScriptReport.value) {
    items.push({ key: 'scripts', label: t('scripts.title') })
  }

  return items
})

const networkHint = computed(() => {
  if (!response.data?.networkDetails) return ''
  return t('networkDetails.hint', { shortcut: t('networkDetails.shortcut') })
})

watch(
  () => response.error,
  (error) => {
    if (error?.scriptReport) activeTab.value = 'scripts'
  }
)

watch(
  () => response.data,
  (data) => {
    if (data) {
      activeTab.value = 'response'
    }
  }
)

function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <div :class="['response-viewer', { 'response-viewer--fullscreen': isFullscreen }]">
    <ResponseMeta />

    <template v-if="response.hasResponse">
      <div v-if="networkHint" class="response-viewer__hint">
        {{ networkHint }}
      </div>

      <div v-if="tabs.length > 0" class="response-viewer__tabs">
        <div class="response-viewer__tabs-left">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['response-viewer__tab', { 'response-viewer__tab--active': activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <button class="response-viewer__fullscreen-btn" :title="t('response.fullscreen')" @click="toggleFullscreen">
          <el-icon :size="14"><FullScreen /></el-icon>
        </button>
      </div>

      <div class="response-viewer__panel">
        <div v-if="showRequestError" class="response-viewer__error-panel">
          <p class="response-viewer__error-title">{{ t('response.error') }}</p>
          <p class="response-viewer__error-message">{{ response.error?.message }}</p>
        </div>
        <ResponseBody v-else-if="activeTab === 'response'" />
        <ResponseHeaders v-else-if="activeTab === 'headers'" />
        <ResponseCookies v-else-if="activeTab === 'cookies'" />
        <ResponseScripts v-else-if="activeTab === 'scripts'" />
      </div>
    </template>

    <div v-else class="response-viewer__empty">
      <p>{{ t('response.noResponse') }}</p>
    </div>
  </div>
</template>

<style scoped>
.response-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-top: 1px solid var(--color-border);
}

.response-viewer--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--color-bg-primary);
  border: none;
  padding: var(--space-md);
}

.response-viewer__hint {
  padding: var(--space-xs) var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  background: var(--color-bg-secondary);
}

.response-viewer__tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-light);
  padding: 0 var(--space-lg);
  flex-shrink: 0;
  background: var(--color-bg-primary);
}

.response-viewer__tabs-left {
  display: flex;
  overflow-x: auto;
}

.response-viewer__tab {
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  position: relative;
  transition: color var(--duration-fast) var(--ease-out);
  white-space: nowrap;
}

.response-viewer__tab:hover {
  color: var(--color-text-secondary);
}

.response-viewer__tab--active {
  color: var(--color-text-primary);
}

.response-viewer__tab--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: var(--space-sm);
  right: var(--space-sm);
  height: 2px;
  background: var(--color-accent);
  border-radius: 2px 2px 0 0;
  animation: tab-indicator 0.25s var(--ease-spring);
}

@keyframes tab-indicator {
  from { transform: scaleX(0); opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
}

.response-viewer__fullscreen-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-spring);
}

.response-viewer__fullscreen-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.response-viewer__fullscreen-btn:active {
  transform: scale(0.9);
}

.response-viewer__panel {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-lg);
}

.response-viewer__error-panel {
  display: grid;
  gap: var(--space-xs);
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.response-viewer__error-title {
  margin: 0;
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
}

.response-viewer__error-message {
  margin: 0;
  color: var(--color-text-secondary);
  word-break: break-word;
}

.response-viewer__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: var(--text-md);
}
</style>

