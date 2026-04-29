<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'

const { t } = useI18n()
const response = useResponseStore()

const details = computed(() => response.data?.networkDetails ?? null)
const timing = computed(() => details.value?.timing ?? null)

const segments = computed(() => {
  if (!timing.value) return []
  return [
    { key: 'ttfb', label: t('networkDetails.timingView.waiting'), value: timing.value.waitingTtfbMs ?? 0, color: 'var(--color-warning)' },
    { key: 'download', label: t('networkDetails.timingView.download'), value: timing.value.downloadMs ?? 0, color: 'var(--color-accent)' }
  ]
})

const totalMeasured = computed(() => segments.value.reduce((sum, item) => sum + item.value, 0) || 1)

function widthFor(value: number): string {
  return `${Math.max((value / totalMeasured.value) * 100, value > 0 ? 8 : 0)}%`
}
</script>

<template>
  <div v-if="timing" class="network-timing">
    <div class="network-timing__summary">
      <div>
        <span class="network-timing__label">{{ t('networkDetails.timingView.total') }}</span>
        <strong>{{ timing.totalMs }} ms</strong>
      </div>
      <div>
        <span class="network-timing__label">{{ t('networkDetails.timingView.accuracy') }}</span>
        <strong>{{ timing.accuracy }}</strong>
      </div>
      <div>
        <span class="network-timing__label">{{ t('networkDetails.timingView.unsupported') }}</span>
        <strong>{{ timing.unsupportedPhases?.join(', ') || t('networkDetails.timingView.none') }}</strong>
      </div>
    </div>

    <div class="network-timing__chart">
      <div v-for="segment in segments" :key="segment.key" class="network-timing__row">
        <div class="network-timing__name">{{ segment.label }}</div>
        <div class="network-timing__bar-track">
          <div class="network-timing__bar" :style="{ width: widthFor(segment.value), background: segment.color }"></div>
        </div>
        <div class="network-timing__value">{{ segment.value }} ms</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.network-timing {
  display: grid;
  gap: var(--space-md);
}

.network-timing__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
}

.network-timing__summary > div {
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.network-timing__label {
  display: block;
  margin-bottom: var(--space-xs);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.network-timing__summary strong {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
}

.network-timing__chart {
  display: grid;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-primary);
}

.network-timing__row {
  display: grid;
  grid-template-columns: 160px 1fr 72px;
  gap: var(--space-md);
  align-items: center;
}

.network-timing__name {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.network-timing__bar-track {
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  overflow: hidden;
}

.network-timing__bar {
  height: 100%;
  border-radius: var(--radius-full);
}

.network-timing__value {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  text-align: right;
}
</style>
