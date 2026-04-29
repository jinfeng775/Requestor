<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'
import MonacoEditor from './MonacoEditor.vue'

const { t } = useI18n()
const response = useResponseStore()

const details = computed(() => response.data?.networkDetails ?? null)
const payload = computed(() => details.value?.request ?? null)
const payloadLanguage = computed(() => {
  const contentType = payload.value?.contentType.toLowerCase() || ''
  if (contentType.includes('json')) return 'json'
  if (contentType.includes('html')) return 'html'
  if (contentType.includes('xml')) return 'xml'
  return 'text'
})
</script>

<template>
  <div v-if="payload" class="network-payload">
    <div class="network-payload__meta">
      <span>{{ payload.bodyType }}</span>
      <span>{{ payload.contentType || t('networkDetails.payloadView.noContentType') }}</span>
      <span>{{ payload.bodySize }} B</span>
    </div>

    <div v-if="payload.bodyPreview" class="network-payload__editor">
      <MonacoEditor :model-value="payload.bodyPreview" :language="payloadLanguage" :readonly="true" />
    </div>
    <div v-else class="network-payload__empty">{{ t('networkDetails.payloadView.empty') }}</div>
  </div>
</template>

<style scoped>
.network-payload {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  height: 100%;
}

.network-payload__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.network-payload__meta span {
  padding: var(--space-xxs) var(--space-sm);
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
}

.network-payload__editor {
  min-height: 320px;
  height: 100%;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.network-payload__empty {
  padding: var(--space-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
}
</style>
