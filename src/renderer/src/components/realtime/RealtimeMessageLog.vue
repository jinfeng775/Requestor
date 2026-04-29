<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRealtimeTabStore } from '@/stores/realtime-tab'
import { useRealtimeSessionStore } from '@/stores/realtime-session'
import { REALTIME_PROTOCOL_LABELS } from '@/types/realtime'

const { t } = useI18n()
const tabStore = useRealtimeTabStore()
const sessionStore = useRealtimeSessionStore()

const activeTab = computed(() => tabStore.activeTab)
const activeSession = computed(() => (activeTab.value ? sessionStore.sessions[activeTab.value.id] : null))
</script>

<template>
  <div class="realtime-log">
    <div class="realtime-log__header">
      <div>
        <strong>{{ t('realtime.sessionStatus') }}</strong>
        <span class="realtime-log__meta">
          {{ activeSession?.status || 'idle' }} · {{ activeTab ? REALTIME_PROTOCOL_LABELS[activeTab.config.protocol] : '-' }}
        </span>
      </div>
      <button v-if="activeTab" class="realtime-log__clear" @click="sessionStore.clearMessages(activeTab.id)">
        {{ t('realtime.clearLog') }}
      </button>
    </div>

    <div v-if="activeSession?.messages.length" class="realtime-log__list">
      <div v-for="message in activeSession.messages" :key="message.id" class="realtime-log__item">
        <div class="realtime-log__row">
          <span class="realtime-log__type">{{ message.type }}</span>
          <span class="realtime-log__time">{{ new Date(message.timestamp).toLocaleTimeString() }}</span>
        </div>
        <pre class="realtime-log__payload">{{ message.payload }}</pre>
      </div>
    </div>
    <div v-else class="realtime-log__empty">
      {{ t('realtime.emptyLog') }}
    </div>
  </div>
</template>

<style scoped>
.realtime-log {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-bg-primary);
}

.realtime-log__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
}

.realtime-log__meta {
  display: inline-block;
  margin-left: var(--space-sm);
  color: var(--color-text-tertiary);
}

.realtime-log__clear {
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  cursor: pointer;
}

.realtime-log__list {
  flex: 1;
  overflow: auto;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.realtime-log__item {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--space-sm);
  background: var(--color-bg-secondary);
}

.realtime-log__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.realtime-log__type {
  color: var(--color-accent);
  font-size: var(--text-xs);
  text-transform: uppercase;
}

.realtime-log__time {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.realtime-log__payload {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.realtime-log__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}
</style>
