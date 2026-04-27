<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'
import type { ScriptExecutionResult } from '@/types/request'

const { t } = useI18n()
const response = useResponseStore()

const report = computed(() => response.data?.scriptReport ?? response.error?.scriptReport ?? null)

function statusLabel(result: ScriptExecutionResult): string {
  return t(`scripts.status.${result.status}`)
}

function mutationLabel(field: string): string {
  return field === 'rawBody' ? 'body' : field
}
</script>

<template>
  <div v-if="report" class="response-scripts">
    <section class="response-scripts__phase">
      <h3>{{ t('scripts.preRequest') }}</h3>
      <span :class="['response-scripts__status', `response-scripts__status--${report.preRequest.status}`]">
        {{ statusLabel(report.preRequest) }} · {{ report.preRequest.durationMs }}ms
      </span>
      <p v-if="report.preRequest.error" class="response-scripts__error">
        {{ report.preRequest.error.message }}
      </p>
      <ul v-if="report.preRequest.logs.length" class="response-scripts__logs">
        <li v-for="(log, index) in report.preRequest.logs" :key="`pre-${index}`">
          <strong>{{ log.level }}</strong> {{ log.message }}
        </li>
      </ul>
    </section>

    <section class="response-scripts__phase">
      <h3>{{ t('scripts.postRequest') }}</h3>
      <span :class="['response-scripts__status', `response-scripts__status--${report.postRequest.status}`]">
        {{ statusLabel(report.postRequest) }} · {{ report.postRequest.durationMs }}ms
      </span>
      <p v-if="report.postRequest.error" class="response-scripts__error">
        {{ report.postRequest.error.message }}
      </p>
      <ul v-if="report.postRequest.logs.length" class="response-scripts__logs">
        <li v-for="(log, index) in report.postRequest.logs" :key="`post-${index}`">
          <strong>{{ log.level }}</strong> {{ log.message }}
        </li>
      </ul>
    </section>

    <section v-if="report.effectiveRequest || report.requestMutations.length" class="response-scripts__phase">
      <h3>{{ t('scripts.requestMutations') }}</h3>
      <p v-if="report.effectiveRequest" class="response-scripts__effective-request">
        {{ report.effectiveRequest.method }} {{ report.effectiveRequest.url }}
      </p>
      <ul v-if="report.requestMutations.length" class="response-scripts__mutations">
        <li v-for="(mutation, index) in report.requestMutations" :key="index">
          {{ mutationLabel(mutation.field) }}<template v-if="mutation.action"> {{ mutation.action }}</template><template v-if="mutation.key"> {{ mutation.key }}</template>
        </li>
      </ul>
    </section>

    <section v-if="report.environmentMutations.length" class="response-scripts__phase">
      <h3>{{ t('scripts.environmentMutations') }}</h3>
      <ul class="response-scripts__mutations">
        <li v-for="(mutation, index) in report.environmentMutations" :key="index">
          {{ mutation.action }} {{ mutation.key }}
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.response-scripts {
  display: grid;
  gap: var(--space-md);
  font-size: var(--text-sm);
}

.response-scripts__phase {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-bg-secondary);
}

.response-scripts__phase h3 {
  margin: 0 0 var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.response-scripts__status {
  color: var(--color-text-secondary);
}

.response-scripts__status--failed,
.response-scripts__status--timeout,
.response-scripts__error {
  color: var(--color-danger);
}

.response-scripts__effective-request,
.response-scripts__logs,
.response-scripts__mutations {
  margin: var(--space-xs) 0 0;
  padding-left: var(--space-lg);
  color: var(--color-text-secondary);
}

.response-scripts__logs strong {
  color: var(--color-text-primary);
}
</style>
