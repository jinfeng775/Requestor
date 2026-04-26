<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'

/** 响应头查看组件 - 以表格形式展示 HTTP 响应头 */

const { t } = useI18n()
const response = useResponseStore()
</script>

<template>
  <div v-if="response.data" class="response-headers">
    <table class="response-headers__table">
      <thead>
        <tr>
          <th>{{ t('responseView.name') }}</th>
          <th>{{ t('responseView.value') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(value, key) in response.data.headers" :key="key">
          <td class="response-headers__name">{{ key }}</td>
          <td class="response-headers__value">{{ value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.response-headers__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.response-headers__table th {
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  border-bottom: 1px solid var(--color-border-light);
}

.response-headers__table td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.response-headers__name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.response-headers__value {
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  word-break: break-all;
}
</style>
