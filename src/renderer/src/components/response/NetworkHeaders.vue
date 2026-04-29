<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'

const { t } = useI18n()
const response = useResponseStore()

const details = computed(() => response.data?.networkDetails ?? null)

const generalRows = computed(() => {
  if (!details.value) return []
  return [
    [t('networkDetails.headersView.requestUrl'), details.value.request.finalUrl],
    [t('networkDetails.headersView.requestMethod'), details.value.request.method],
    [t('networkDetails.headersView.statusCode'), `${details.value.response.status} ${details.value.response.statusText}`],
    [t('networkDetails.headersView.remoteAddress'), details.value.response.remoteAddress || t('networkDetails.overview.unavailable')],
    [t('networkDetails.headersView.referrerPolicy'), response.data?.headers['referrer-policy'] || t('networkDetails.overview.unavailable')]
  ]
})
</script>

<template>
  <div v-if="details" class="network-headers">
    <section class="network-headers__section">
      <h3>{{ t('networkDetails.headersView.general') }}</h3>
      <table class="network-headers__table">
        <tbody>
          <tr v-for="([name, value], index) in generalRows" :key="`general-${index}`">
            <td class="network-headers__name">{{ name }}</td>
            <td class="network-headers__value">{{ value }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="network-headers__section">
      <h3>{{ t('networkDetails.headersView.queryString') }}</h3>
      <table class="network-headers__table">
        <thead>
          <tr>
            <th>{{ t('responseView.name') }}</th>
            <th>{{ t('responseView.value') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(param, index) in details.request.queryString" :key="`query-${index}`">
            <td class="network-headers__name">{{ param.key }}</td>
            <td class="network-headers__value">{{ param.value }}</td>
          </tr>
          <tr v-if="details.request.queryString.length === 0">
            <td colspan="2" class="network-headers__empty">{{ t('networkDetails.headersView.emptyQuery') }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="network-headers__section">
      <h3>{{ t('networkDetails.headersView.requestHeaders') }}</h3>
      <table class="network-headers__table">
        <thead>
          <tr>
            <th>{{ t('responseView.name') }}</th>
            <th>{{ t('responseView.value') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(header, index) in details.request.headers" :key="`request-${index}`">
            <td class="network-headers__name">{{ header.name }}</td>
            <td class="network-headers__value">{{ header.value }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="network-headers__section">
      <h3>{{ t('networkDetails.headersView.responseHeaders') }}</h3>
      <table class="network-headers__table">
        <thead>
          <tr>
            <th>{{ t('responseView.name') }}</th>
            <th>{{ t('responseView.value') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(header, index) in details.response.headers" :key="`response-${index}`">
            <td class="network-headers__name">{{ header.name }}</td>
            <td class="network-headers__value">{{ header.value }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.network-headers {
  display: grid;
  gap: var(--space-md);
}

.network-headers__section {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-bg-primary);
}

.network-headers__section h3 {
  margin: 0;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.network-headers__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.network-headers__table th,
.network-headers__table td {
  padding: var(--space-xs) var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
  vertical-align: top;
}

.network-headers__table th {
  text-align: left;
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
}

.network-headers__name {
  width: 240px;
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.network-headers__value {
  color: var(--color-text-primary);
  font-family: var(--font-family-mono);
  word-break: break-all;
}

.network-headers__empty {
  color: var(--color-text-tertiary);
}
</style>
