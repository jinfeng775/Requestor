<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'

/** 响应 Cookie 查看组件 - 以表格形式展示 HTTP 响应中的 Cookie */

const { t } = useI18n()
const response = useResponseStore()
</script>

<template>
  <div v-if="response.data" class="response-cookies">
    <table v-if="response.data.cookies.length > 0" class="response-cookies__table">
      <thead>
        <tr>
          <th>{{ t('responseView.name') }}</th>
          <th>{{ t('responseView.value') }}</th>
          <th>{{ t('responseView.domain') }}</th>
          <th>{{ t('responseView.path') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(cookie, i) in response.data.cookies" :key="i">
          <td class="response-cookies__name">{{ cookie.name }}</td>
          <td class="response-cookies__value">{{ cookie.value }}</td>
          <td class="response-cookies__domain">{{ cookie.domain }}</td>
          <td class="response-cookies__path">{{ cookie.path }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="response-cookies__empty">
      {{ t('response.noCookies') }}
    </div>
  </div>
</template>

<style scoped>
.response-cookies__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.response-cookies__table th {
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  color: var(--color-text-tertiary);
  font-weight: var(--font-weight-medium);
  border-bottom: 1px solid var(--color-border-light);
}

.response-cookies__table td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.response-cookies__name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.response-cookies__value {
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  word-break: break-all;
}

.response-cookies__domain,
.response-cookies__path {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.response-cookies__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}
</style>
