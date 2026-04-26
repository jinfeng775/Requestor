<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import ParamsEditor from './ParamsEditor.vue'
import HeadersEditor from './HeadersEditor.vue'
import BodyEditor from './BodyEditor.vue'
import AuthEditor from './AuthEditor.vue'

const { t } = useI18n()
const editor = useRequestEditorStore()

const activeTab = ref('params') // 当前激活的标签页(params/headers/body/auth)

/** 请求构建器的标签页配置 */
const tabs = [
  { key: 'params', labelKey: 'request.params' },
  { key: 'headers', labelKey: 'request.headers' },
  { key: 'body', labelKey: 'request.body' },
  { key: 'auth', labelKey: 'request.auth' }
]
</script>

<template>
  <div class="request-builder">
    <div class="request-builder__description">
      <input
        class="request-builder__desc-input"
        :value="editor.activeRequest.description"
        :placeholder="t('request.description')"
        @input="editor.updateRequest({ description: $event.target.value })"
      />
    </div>
    <div class="request-builder__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['request-builder__tab', { 'request-builder__tab--active': activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>
    <div class="request-builder__panel">
      <ParamsEditor v-if="activeTab === 'params'" />
      <HeadersEditor v-else-if="activeTab === 'headers'" />
      <BodyEditor v-else-if="activeTab === 'body'" />
      <AuthEditor v-else-if="activeTab === 'auth'" />
    </div>
  </div>
</template>

<style scoped>
.request-builder {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.request-builder__description {
  padding: var(--space-xs) var(--space-lg);
  flex-shrink: 0;
}

.request-builder__desc-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  padding: var(--space-xs) 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: transparent;
  outline: none;
  transition: color var(--duration-fast);
  box-sizing: border-box;
}

.request-builder__desc-input:focus {
  color: var(--color-text-secondary);
  border-bottom-color: var(--color-accent);
}

.request-builder__desc-input::placeholder {
  color: var(--color-text-placeholder);
}

.request-builder__tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border-light);
  padding: 0 var(--space-lg);
  flex-shrink: 0;
}

.request-builder__tab {
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

.request-builder__tab:hover {
  color: var(--color-text-secondary);
}

.request-builder__tab--active {
  color: var(--color-text-primary);
}

.request-builder__tab--active::after {
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

.request-builder__panel {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-lg);
}
</style>
