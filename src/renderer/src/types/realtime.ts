import type { KeyValue } from './request'

export type RealtimeWorkspace = 'http' | 'realtime'
export type RealtimeProtocol = 'websocket' | 'sse' | 'socketio' | 'mqtt'
export type RealtimeSessionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
export type RealtimeMessageDirection = 'in' | 'out' | 'system'
export type RealtimeEventType =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'message-in'
  | 'message-out'
  | 'system'
  | 'subscription-added'
  | 'subscription-removed'

export interface RealtimeSubscription {
  id: string
  value: string
  qos?: 0 | 1 | 2
}

interface RealtimeConfigBase {
  id: string
  name: string
  description: string
  protocol: RealtimeProtocol
  headers: KeyValue[]
  query: KeyValue[]
}

export interface WebSocketRealtimeConfig extends RealtimeConfigBase {
  protocol: 'websocket'
  url: string
  subprotocols: string[]
}

export interface SseRealtimeConfig extends RealtimeConfigBase {
  protocol: 'sse'
  url: string
}

export interface SocketIoRealtimeConfig extends RealtimeConfigBase {
  protocol: 'socketio'
  url: string
  namespace: string
  eventName: string
  authPayload: string
}

export interface MqttRealtimeConfig extends RealtimeConfigBase {
  protocol: 'mqtt'
  brokerUrl: string
  clientId: string
  username: string
  password: string
  publishTopic: string
  publishQos: 0 | 1 | 2
  cleanSession: boolean
  keepaliveSeconds: number
  subscriptions: RealtimeSubscription[]
}

export type RealtimeConnectionConfig =
  | WebSocketRealtimeConfig
  | SseRealtimeConfig
  | SocketIoRealtimeConfig
  | MqttRealtimeConfig

export interface RealtimeTab {
  id: string
  name: string
  config: RealtimeConnectionConfig
  hasUnsavedChanges: boolean
}

export interface RealtimeMessageEntry {
  id: string
  sessionId: string
  tabId: string
  protocol: RealtimeProtocol
  type: RealtimeEventType
  direction: RealtimeMessageDirection
  payload: string
  timestamp: number
  meta?: Record<string, string | number | boolean | null | undefined>
}

export interface RealtimeSessionState {
  tabId: string
  sessionId: string | null
  protocol: RealtimeProtocol
  status: RealtimeSessionStatus
  connectedAt: number | null
  disconnectedAt: number | null
  lastError: string | null
  messages: RealtimeMessageEntry[]
}

export interface RealtimeEventEnvelope {
  sessionId: string
  tabId: string
  protocol: RealtimeProtocol
  type: RealtimeEventType
  timestamp: number
  payload: string
  meta?: Record<string, string | number | boolean | null | undefined>
}

export interface RealtimeCommandError {
  message: string
  code: string
}

export interface RealtimeConnectResult {
  sessionId: string
  protocol: RealtimeProtocol
}

export const REALTIME_PROTOCOL_LABELS: Record<RealtimeProtocol, string> = {
  websocket: 'WebSocket',
  sse: 'SSE',
  socketio: 'Socket.IO',
  mqtt: 'MQTT'
}

export function createDefaultRealtimeConfig(protocol: RealtimeProtocol = 'websocket'): RealtimeConnectionConfig {
  const base = {
    id: '',
    name: '',
    description: '',
    protocol,
    headers: [],
    query: []
  }

  if (protocol === 'websocket') {
    return {
      ...base,
      protocol,
      url: '',
      subprotocols: []
    }
  }

  if (protocol === 'sse') {
    return {
      ...base,
      protocol,
      url: ''
    }
  }

  if (protocol === 'socketio') {
    return {
      ...base,
      protocol,
      url: '',
      namespace: '/',
      eventName: 'message',
      authPayload: ''
    }
  }

  return {
    ...base,
    protocol,
    brokerUrl: '',
    clientId: '',
    username: '',
    password: '',
    publishTopic: '',
    publishQos: 0,
    cleanSession: true,
    keepaliveSeconds: 60,
    subscriptions: []
  }
}
