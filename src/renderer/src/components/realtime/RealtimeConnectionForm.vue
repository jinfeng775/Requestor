<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnvironmentStore } from '@/stores/environment'
import { useRealtimeTabStore } from '@/stores/realtime-tab'
import { useRealtimeSessionStore } from '@/stores/realtime-session'
import {
  REALTIME_PROTOCOL_LABELS,
  createDefaultRealtimeConfig,
  type MqttRealtimeConfig,
  type RealtimeConnectionConfig,
  type RealtimeProtocol,
  type SocketIoRealtimeConfig
} from '@/types/realtime'

defineProps<{
  connected: boolean
}>()

const { t } = useI18n()
const envStore = useEnvironmentStore()
const tabStore = useRealtimeTabStore()
const sessionStore = useRealtimeSessionStore()
const messagePayload = ref('')
const subscriptionValue = ref('')
const protocolOptions = Object.keys(REALTIME_PROTOCOL_LABELS) as RealtimeProtocol[]

const activeTab = computed(() => tabStore.activeTab)
const activeSession = computed(() => (activeTab.value ? sessionStore.sessions[activeTab.value.id] : null))
const protocol = computed(() => activeTab.value?.config.protocol ?? 'websocket')

function updateConfig(config: RealtimeConnectionConfig): void {
  if (!activeTab.value) return
  tabStore.updateTabConfig(activeTab.value.id, config)
  sessionStore.syncTab(activeTab.value.id, config.protocol)
}

function updateProtocol(nextProtocol: RealtimeProtocol): void {
  if (!activeTab.value) return
  const nextConfig = createDefaultRealtimeConfig(nextProtocol)
  nextConfig.id = activeTab.value.config.id
  nextConfig.name = activeTab.value.config.name
  nextConfig.description = activeTab.value.config.description
  updateConfig(nextConfig)
}

function getEndpointValue(config: RealtimeConnectionConfig): string {
  return 'url' in config ? config.url : config.brokerUrl
}

function setEndpointValue(value: string): void {
  if (!activeTab.value) return
  if ('url' in activeTab.value.config) {
    updateConfig({ ...activeTab.value.config, url: value })
    return
  }
  updateConfig({ ...activeTab.value.config, brokerUrl: value })
}

function setTabName(value: string): void {
  if (!activeTab.value) return
  tabStore.updateTabName(activeTab.value.id, value)
}

function updateSocketIoNamespace(value: string): void {
  if (!activeTab.value || activeTab.value.config.protocol !== 'socketio') return
  updateConfig({ ...activeTab.value.config, namespace: value } satisfies SocketIoRealtimeConfig)
}

function updateSocketIoEventName(value: string): void {
  if (!activeTab.value || activeTab.value.config.protocol !== 'socketio') return
  updateConfig({ ...activeTab.value.config, eventName: value } satisfies SocketIoRealtimeConfig)
}

function updateMqttClientId(value: string): void {
  if (!activeTab.value || activeTab.value.config.protocol !== 'mqtt') return
  updateConfig({ ...activeTab.value.config, clientId: value } satisfies MqttRealtimeConfig)
}

function updateMqttPublishTopic(value: string): void {
  if (!activeTab.value || activeTab.value.config.protocol !== 'mqtt') return
  updateConfig({ ...activeTab.value.config, publishTopic: value } satisfies MqttRealtimeConfig)
}

function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

async function connect(): Promise<void> {
  if (!activeTab.value || !window.api) return
  await window.api.realtimeConnect(activeTab.value.id, activeTab.value.config, envStore.activeVars)
}

async function disconnect(): Promise<void> {
  if (!activeSession.value?.sessionId || !window.api) return
  await window.api.realtimeDisconnect(activeSession.value.sessionId)
}

async function sendMessage(): Promise<void> {
  if (!activeSession.value?.sessionId || !window.api || !messagePayload.value.trim()) return

  const meta =
    protocol.value === 'mqtt'
      ? { topic: activeTab.value && 'publishTopic' in activeTab.value.config ? activeTab.value.config.publishTopic : '' }
      : protocol.value === 'socketio'
        ? { eventName: activeTab.value && 'eventName' in activeTab.value.config ? activeTab.value.config.eventName : '' }
        : undefined

  await window.api.realtimeSend(activeSession.value.sessionId, messagePayload.value, meta)
  messagePayload.value = ''
}

async function subscribe(): Promise<void> {
  if (!activeSession.value?.sessionId || !window.api || !subscriptionValue.value.trim()) return

  const qos =
    protocol.value === 'mqtt' && activeTab.value && 'publishQos' in activeTab.value.config
      ? activeTab.value.config.publishQos
      : 0

  await window.api.realtimeSubscribe(activeSession.value.sessionId, subscriptionValue.value, { qos })
  subscriptionValue.value = ''
}
</script>

<template>
  <div v-if="activeTab" class="realtime-form">
    <div class="realtime-form__protocols">
      <button
        v-for="item in protocolOptions"
        :key="item"
        :class="['realtime-form__protocol', { 'realtime-form__protocol--active': item === protocol }]"
        @click="updateProtocol(item)"
      >
        {{ REALTIME_PROTOCOL_LABELS[item] }}
      </button>
    </div>

    <div class="realtime-form__grid">
      <label class="realtime-form__field">
        <span>{{ t('realtime.endpoint') }}</span>
        <input
          :value="getEndpointValue(activeTab.config)"
          :placeholder="protocol === 'mqtt' ? 'mqtt://broker.example.com' : 'wss://example.com/socket'"
          @input="setEndpointValue(getInputValue($event))"
        />
      </label>
      <label class="realtime-form__field">
        <span>{{ t('common.name') }}</span>
        <input
          :value="activeTab.name"
          :placeholder="REALTIME_PROTOCOL_LABELS[protocol]"
          @input="setTabName(getInputValue($event))"
        />
      </label>

      <label v-if="protocol === 'socketio'" class="realtime-form__field">
        <span>{{ t('realtime.namespace') }}</span>
        <input
          :value="'namespace' in activeTab.config ? activeTab.config.namespace : ''"
          placeholder="/"
          @input="updateSocketIoNamespace(getInputValue($event))"
        />
      </label>

      <label v-if="protocol === 'socketio'" class="realtime-form__field">
        <span>{{ t('realtime.eventName') }}</span>
        <input
          :value="'eventName' in activeTab.config ? activeTab.config.eventName : ''"
          placeholder="message"
          @input="updateSocketIoEventName(getInputValue($event))"
        />
      </label>

      <label v-if="protocol === 'mqtt'" class="realtime-form__field">
        <span>{{ t('realtime.clientId') }}</span>
        <input
          :value="'clientId' in activeTab.config ? activeTab.config.clientId : ''"
          placeholder="requestor-client"
          @input="updateMqttClientId(getInputValue($event))"
        />
      </label>

      <label v-if="protocol === 'mqtt'" class="realtime-form__field">
        <span>{{ t('realtime.publishTopic') }}</span>
        <input
          :value="'publishTopic' in activeTab.config ? activeTab.config.publishTopic : ''"
          placeholder="devices/status"
          @input="updateMqttPublishTopic(getInputValue($event))"
        />
      </label>
    </div>

    <div class="realtime-form__actions">
      <button class="realtime-form__primary" @click="connected ? disconnect() : connect()">
        {{ connected ? t('realtime.disconnect') : t('realtime.connect') }}
      </button>

      <template v-if="protocol !== 'sse'">
        <input
          v-model="messagePayload"
          class="realtime-form__message"
          :placeholder="t('realtime.messagePlaceholder')"
        />
        <button class="realtime-form__secondary" :disabled="!connected" @click="sendMessage">
          {{ t('realtime.sendMessage') }}
        </button>
      </template>

      <template v-if="protocol === 'mqtt' || protocol === 'socketio'">
        <input
          v-model="subscriptionValue"
          class="realtime-form__message"
          :placeholder="t('realtime.subscriptionPlaceholder')"
        />
        <button class="realtime-form__secondary" :disabled="!connected" @click="subscribe">
          {{ t('realtime.subscribe') }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.realtime-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
}

.realtime-form__protocols {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.realtime-form__protocol,
.realtime-form__primary,
.realtime-form__secondary {
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  cursor: pointer;
}

.realtime-form__protocol--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.realtime-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.realtime-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.realtime-form__field input,
.realtime-form__message {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
}

.realtime-form__actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.realtime-form__primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.realtime-form__secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.realtime-form__message {
  flex: 1;
}
</style>
