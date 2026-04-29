<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'

const { t } = useI18n()
const response = useResponseStore()

const details = computed(() => response.data?.networkDetails ?? null)
const overview = computed(() => details.value?.overview ?? null)
const responseSnapshot = computed(() => details.value?.response ?? null)
const requestSnapshot = computed(() => details.value?.request ?? null)
const redirectCount = computed(() => details.value?.redirects.length ?? 0)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)} s`
}
</script>

<template>
  <div v-if="overview && responseSnapshot && requestSnapshot" class="network-overview">
    <section class="network-overview__hero">
      <div class="network-overview__method">{{ overview.method }}</div>
      <div class="network-overview__hero-main">
        <div class="network-overview__url">{{ overview.finalUrl }}</div>
        <div class="network-overview__meta">
          <span>{{ overview.status }} {{ overview.statusText }}</span>
          <span>{{ formatTime(overview.totalTime) }}</span>
          <span>{{ formatSize(overview.transferredSize) }}</span>
          <span v-if="overview.protocol">{{ overview.protocol }}</span>
          <span v-if="redirectCount > 0">{{ t('networkDetails.overview.redirects', { count: redirectCount }) }}</span>
        </div>
      </div>
    </section>

    <div class="network-overview__grid">
      <div class="network-overview__card">
        <h3>{{ t('networkDetails.overview.request') }}</h3>
        <dl>
          <div>
            <dt>{{ t('networkDetails.overview.body') }}</dt>
            <dd>{{ formatSize(overview.requestBodySize) }}</dd>
          </div>
          <div>
            <dt>{{ t('networkDetails.overview.headers') }}</dt>
            <dd>{{ requestSnapshot.headers.length }}</dd>
          </div>
          <div>
            <dt>{{ t('networkDetails.overview.queryParams') }}</dt>
            <dd>{{ requestSnapshot.queryString.length }}</dd>
          </div>
        </dl>
      </div>

      <div class="network-overview__card">
        <h3>{{ t('networkDetails.overview.response') }}</h3>
        <dl>
          <div>
            <dt>{{ t('networkDetails.overview.body') }}</dt>
            <dd>{{ formatSize(overview.responseBodySize) }}</dd>
          </div>
          <div>
            <dt>{{ t('networkDetails.overview.headers') }}</dt>
            <dd>{{ responseSnapshot.headers.length }}</dd>
          </div>
          <div>
            <dt>{{ t('networkDetails.overview.cookies') }}</dt>
            <dd>{{ responseSnapshot.cookies.length }}</dd>
          </div>
        </dl>
      </div>

      <div class="network-overview__card">
        <h3>{{ t('networkDetails.overview.connection') }}</h3>
        <dl>
          <div>
            <dt>{{ t('networkDetails.overview.protocol') }}</dt>
            <dd>{{ responseSnapshot.protocol || t('networkDetails.overview.unknown') }}</dd>
          </div>
          <div>
            <dt>{{ t('networkDetails.overview.remoteIp') }}</dt>
            <dd>{{ responseSnapshot.remoteAddress || t('networkDetails.overview.unavailable') }}</dd>
          </div>
          <div>
            <dt>{{ t('networkDetails.overview.remotePort') }}</dt>
            <dd>{{ responseSnapshot.remotePort ?? t('networkDetails.overview.unavailable') }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<style scoped>
.network-overview {
  display: grid;
  gap: var(--space-md);
}

.network-overview__hero {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-md);
  align-items: start;
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
}

.network-overview__method {
  min-width: 64px;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  background: rgba(0, 122, 255, 0.1);
  color: var(--color-accent);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.network-overview__hero-main {
  min-width: 0;
}

.network-overview__url {
  color: var(--color-text-primary);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-normal);
  word-break: break-all;
}

.network-overview__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.network-overview__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
}

.network-overview__card {
  padding: var(--space-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.network-overview__card h3 {
  margin: 0 0 var(--space-sm);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.network-overview__card dl {
  display: grid;
  gap: var(--space-sm);
  margin: 0;
}

.network-overview__card dl div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
}

.network-overview__card dt {
  color: var(--color-text-tertiary);
}

.network-overview__card dd {
  margin: 0;
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  text-align: right;
}
</style>
