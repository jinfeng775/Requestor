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
const activeTab = ref('body') // 当前激活的标签页(body/headers/cookies/scripts)
const isFullscreen = ref(false) // 是否处于全屏模式

/** 响应查看器的标签页配置 */
const tabs = computed(() => {
  const scriptTab = { key: 'scripts', labelKey: 'scripts.title' }
  if (response.data) {
    return [
      { key: 'body', labelKey: 'response.body' },
      { key: 'headers', labelKey: 'response.headers' },
      { key: 'cookies', labelKey: 'response.cookies' },
      scriptTab
    ]
  }

  return [scriptTab]
})

watch(
  () => response.error,
  (error) => {
    if (error?.scriptReport) activeTab.value = 'scripts'
  }
)

/** 切换全屏模式 */
function toggleFullscreen(): void {
  isFullscreen.value = !isFullscreen.value
}

/**
 * 全局键盘事件监听器
 * 在全屏模式下按 Escape 键退出全屏
 * @param e 键盘事件对象
 */
function onGlobalKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

// 组件挂载时添加全局键盘监听,卸载时移除(防止内存泄漏)
onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <div :class="['response-viewer', { 'response-viewer--fullscreen': isFullscreen }]">
    <ResponseMeta />

    <template v-if="response.hasResponse">
      <div class="response-viewer__tabs">
        <div class="response-viewer__tabs-left">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['response-viewer__tab', { 'response-viewer__tab--active': activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ t(tab.labelKey) }}
            <span v-if="tab.key === 'headers' && response.data" class="response-viewer__tab-count">
              ({{ Object.keys(response.data.headers).length }})
            </span>
          </button>
        </div>
        <button class="response-viewer__fullscreen-btn" :title="t('response.fullscreen')" @click="toggleFullscreen">
          <el-icon :size="14"><FullScreen /></el-icon>
        </button>
      </div>

      <div class="response-viewer__panel">
        <ResponseBody v-if="activeTab === 'body'" />
        <ResponseHeaders v-else-if="activeTab === 'headers'" />
        <ResponseCookies v-else-if="activeTab === 'cookies'" />
        <ResponseScripts v-else-if="activeTab === 'scripts'" />
      </div>
    </template>

    <div v-else-if="!response.hasResponse" class="response-viewer__empty">
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

.response-viewer__tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-light);
  padding: 0 var(--space-lg);
  flex-shrink: 0;
}

.response-viewer__tabs-left {
  display: flex;
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

.response-viewer__tab-count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-left: 2px;
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

.response-viewer__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  font-size: var(--text-md);
}
</style>
