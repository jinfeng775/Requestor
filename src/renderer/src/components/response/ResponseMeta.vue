<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'
import { computed } from 'vue'

const { t } = useI18n()
const response = useResponseStore()

/**
 * 根据 HTTP 状态码返回对应的 CSS 类名(用于颜色区分)
 * @returns CSS 类名(如 "status--2xx", "status--4xx")
 */
const statusClass = computed(() => {
  if (!response.data) return ''
  const s = response.data.status
  if (s >= 200 && s < 300) return 'status--2xx'
  if (s >= 300 && s < 400) return 'status--3xx'
  if (s >= 400 && s < 500) return 'status--4xx'
  return 'status--5xx'
})

/**
 * 格式化字节数为人类可读格式(B/KB/MB)
 * @param bytes 字节数
 * @returns 格式化后的字符串(如 "1.5 KB")
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 格式化毫秒数为人类可读格式(ms/s)
 * @param ms 毫秒数
 * @returns 格式化后的字符串(如 "1.25 s")
 */
function formatTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}
</script>

<template>
  <div v-if="response.data" class="response-meta">
    <span class="response-meta__badge" :class="statusClass">
      {{ response.data.status }} {{ response.data.statusText }}
    </span>
    <span class="response-meta__item">
      <span class="response-meta__label">{{ t('response.time') }}</span>
      <span class="response-meta__value">{{ formatTime(response.data.totalTime) }}</span>
    </span>
    <span class="response-meta__item">
      <span class="response-meta__label">{{ t('response.size') }}</span>
      <span class="response-meta__value">{{ formatSize(response.data.bodySize) }}</span>
    </span>
  </div>
  <div v-else-if="response.error" class="response-meta response-meta--error">
    <span class="response-meta__badge status--5xx">{{ t('response.error') }}</span>
    <span class="response-meta__message">{{ response.error.message }}</span>
  </div>
</template>

<style scoped>
.response-meta {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-sm) var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--text-sm);
  flex-shrink: 0;
  flex-wrap: wrap;
  position: relative;
}

.response-meta--error {
  color: var(--color-danger);
}

.response-meta__badge {
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-sm);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
}

.status--2xx { color: var(--color-status-2xx); background: rgba(52, 199, 89, 0.1); }
.status--3xx { color: var(--color-status-3xx); background: rgba(0, 122, 255, 0.1); }
.status--4xx { color: var(--color-status-4xx); background: rgba(255, 159, 10, 0.1); }
.status--5xx { color: var(--color-status-5xx); background: rgba(255, 59, 48, 0.1); }

.response-meta__item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--color-text-secondary);
}

.response-meta__label {
  color: var(--color-text-tertiary);
}

.response-meta__value {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
}

.response-meta__message {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
</style>
