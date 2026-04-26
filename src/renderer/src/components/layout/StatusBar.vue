<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnvironmentStore } from '@/stores/environment'
import { useRequestEditorStore } from '@/stores/request-editor'
import { useResponseStore } from '@/stores/response'
import { useTabStore } from '@/stores/tab'
import { useHistoryStore } from '@/stores/history'
import { useCollectionStore } from '@/stores/collection'
import { useCacheStats } from '@/composables/useCacheStats'
import EnvironmentManager from '../environment/EnvironmentManager.vue'

const { t } = useI18n()
const envStore = useEnvironmentStore()
const editor = useRequestEditorStore()
const response = useResponseStore()
const tabStore = useTabStore()
const historyStore = useHistoryStore()
const collectionStore = useCollectionStore()
const showEnvManager = ref(false) // 是否显示环境管理器对话框

const {
  historySize,
  collectionsSize,
  totalSize,
  historyColor,
  collectionsColor,
  totalColor,
  formatSize,
  refresh
} = useCacheStats()

// 监听历史记录和集合变化，刷新缓存统计
watch(() => historyStore.entries.length, () => {
  setTimeout(() => refresh(), 100)
})

watch(() => collectionStore.collections.length, () => {
  setTimeout(() => refresh(), 100)
}, { deep: true })

/** 根据当前 HTTP 方法返回对应的 CSS 类名 */
const methodClass = computed(() => `statusbar__method statusbar__method--${editor.activeRequest.method.toLowerCase()}`)

/**
 * 格式化毫秒数为人类可读格式(ms/s)
 * @param ms 毫秒数
 * @returns 格式化后的字符串(如 "1.25s")
 */
function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * 格式化字节数为人类可读格式(B/KB/MB)
 * @param bytes 字节数
 * @returns 格式化后的字符串(如 "1.5KB")
 */
function formatSizeLocal(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
</script>

<template>
  <div class="statusbar">
    <div class="statusbar__left">
      <button class="statusbar__env-btn" @click="showEnvManager = true">
        <span
          class="statusbar__dot"
          :style="{ background: envStore.activeEnv ? 'var(--color-success)' : 'var(--color-text-tertiary)' }"
        ></span>
        {{ envStore.activeEnv ? envStore.activeEnv.name : t('environment.noActive') }}
      </button>
      <span class="statusbar__divider">|</span>
      <span :class="methodClass">{{ editor.activeRequest.method }}</span>
      <template v-if="response.data">
        <span class="statusbar__divider">|</span>
        <span class="statusbar__stat">
          {{ response.data.status }}
        </span>
        <span class="statusbar__divider">|</span>
        <span class="statusbar__stat">{{ formatTime(response.data.totalTime) }}</span>
        <span class="statusbar__divider">|</span>
        <span class="statusbar__stat">{{ formatSizeLocal(response.data.bodySize) }}</span>
      </template>
    </div>
    <div class="statusbar__right">
      <el-tooltip placement="top" :show-after="300">
        <template #content>
          <div class="statusbar__cache-tooltip">
            <div>{{ t('cache.history') }}: {{ formatSize(historySize) }}</div>
            <div>{{ t('cache.collections') }}: {{ formatSize(collectionsSize) }}</div>
            <div class="statusbar__cache-tooltip-total">{{ t('cache.total') }}: {{ formatSize(totalSize) }}</div>
          </div>
        </template>
        <div class="statusbar__cache">
          <span class="statusbar__cache-label">{{ t('cache.title') }}:</span>
          <span class="statusbar__cache-total" :style="{ color: totalColor.color }">
            {{ formatSize(totalSize) }}
          </span>
        </div>
      </el-tooltip>
      <span class="statusbar__divider">|</span>
      <span v-if="tabStore.tabs.length > 1" class="statusbar__tabs-info">
        {{ tabStore.tabs.length }} tabs
      </span>
      <span class="statusbar__version">v1.0.0</span>
    </div>

    <EnvironmentManager v-model:visible="showEnvManager" />
  </div>
</template>

<style scoped>
.statusbar {
  height: var(--statusbar-height);
  background: var(--color-bg-tertiary);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-md);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  user-select: none;
}

.statusbar__left,
.statusbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.statusbar__env-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  border: none;
  background: transparent;
  color: inherit;
  font-size: inherit;
  cursor: pointer;
  padding: 0;
}

.statusbar__env-btn:hover { color: var(--color-text-secondary); }

.statusbar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.statusbar__divider {
  color: var(--color-border);
  font-size: var(--text-xs);
}

.statusbar__method {
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-semibold);
}

.statusbar__method--get    { color: var(--color-method-get); }
.statusbar__method--post   { color: var(--color-method-post); }
.statusbar__method--put    { color: var(--color-method-put); }
.statusbar__method--delete { color: var(--color-method-delete); }
.statusbar__method--patch  { color: var(--color-method-patch); }
.statusbar__method--head   { color: var(--color-method-head); }
.statusbar__method--options{ color: var(--color-method-options); }

.statusbar__stat {
  color: var(--color-text-secondary);
}

.statusbar__cache {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-family-mono);
  cursor: help;
}

.statusbar__cache-label {
  color: var(--color-text-tertiary);
}

.statusbar__cache-total {
  font-weight: var(--font-weight-semibold);
  transition: color var(--duration-fast);
}

.statusbar__cache-tooltip {
  font-size: var(--text-xs);
  line-height: 1.6;
}

.statusbar__cache-tooltip-total {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: var(--font-weight-semibold);
}

.statusbar__tabs-info {
  opacity: 0.6;
}

.statusbar__version { opacity: 0.6; }
</style>
