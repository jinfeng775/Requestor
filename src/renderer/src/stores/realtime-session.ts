import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { nanoid } from '@/utils/uuid'
import type { RealtimeEventEnvelope, RealtimeMessageEntry, RealtimeProtocol, RealtimeSessionState } from '@/types/realtime'

const MAX_MESSAGES_PER_SESSION = 200

function createIdleSession(tabId: string, protocol: RealtimeProtocol): RealtimeSessionState {
  return {
    tabId,
    sessionId: null,
    protocol,
    status: 'idle',
    connectedAt: null,
    disconnectedAt: null,
    lastError: null,
    messages: []
  }
}

function createMessage(event: RealtimeEventEnvelope): RealtimeMessageEntry {
  return {
    id: nanoid(),
    sessionId: event.sessionId,
    tabId: event.tabId,
    protocol: event.protocol,
    type: event.type,
    direction:
      event.type === 'message-in'
        ? 'in'
        : event.type === 'message-out'
          ? 'out'
          : 'system',
    payload: event.payload,
    timestamp: event.timestamp,
    meta: event.meta
  }
}

export const useRealtimeSessionStore = defineStore('realtime-session', () => {
  const sessions = ref<Record<string, RealtimeSessionState>>({})

  const activeSessions = computed(() => sessions.value)

  function ensureSession(tabId: string, protocol: RealtimeProtocol): RealtimeSessionState {
    const existing = sessions.value[tabId]
    if (existing) return existing

    const next = createIdleSession(tabId, protocol)
    sessions.value = { ...sessions.value, [tabId]: next }
    return next
  }

  function syncTab(tabId: string, protocol: RealtimeProtocol): void {
    const existing = sessions.value[tabId]
    if (!existing) {
      ensureSession(tabId, protocol)
      return
    }

    sessions.value = {
      ...sessions.value,
      [tabId]: {
        ...existing,
        protocol
      }
    }
  }

  function removeSession(tabId: string): void {
    const next = { ...sessions.value }
    delete next[tabId]
    sessions.value = next
  }

  function applyEvent(event: RealtimeEventEnvelope): void {
    const current = ensureSession(event.tabId, event.protocol)
    const message = createMessage(event)
    const nextMessages = [...current.messages, message].slice(-MAX_MESSAGES_PER_SESSION)
    const nextState: RealtimeSessionState = {
      ...current,
      protocol: event.protocol,
      sessionId: event.sessionId,
      messages: nextMessages
    }

    if (event.type === 'connecting') {
      nextState.status = 'connecting'
      nextState.lastError = null
    } else if (event.type === 'connected') {
      nextState.status = 'connected'
      nextState.connectedAt = event.timestamp
      nextState.disconnectedAt = null
      nextState.lastError = null
    } else if (event.type === 'disconnected') {
      nextState.status = 'disconnected'
      nextState.disconnectedAt = event.timestamp
    } else if (event.type === 'error') {
      nextState.status = 'error'
      nextState.lastError = event.payload
    }

    sessions.value = {
      ...sessions.value,
      [event.tabId]: nextState
    }
  }

  function clearMessages(tabId: string): void {
    const current = sessions.value[tabId]
    if (!current) return
    sessions.value = {
      ...sessions.value,
      [tabId]: {
        ...current,
        messages: []
      }
    }
  }

  return {
    sessions,
    activeSessions,
    ensureSession,
    syncTab,
    removeSession,
    applyEvent,
    clearMessages
  }
})
