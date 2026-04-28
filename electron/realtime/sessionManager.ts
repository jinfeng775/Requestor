import { randomUUID } from 'node:crypto'
import { resolveVariables } from '../http/variables/resolveVariables'
import { createSseTransport } from './protocols/sseClient'
import { createWebSocketTransport } from './protocols/websocketClient'
import type {
  MqttRealtimeConfig,
  RealtimeConnectionConfig,
  RealtimeEventEnvelope,
  RealtimeProtocol,
  SocketIoRealtimeConfig,
  SseRealtimeConfig,
  WebSocketRealtimeConfig
} from '../../src/renderer/src/types/realtime'
import type {
  RealtimeTransport,
  RealtimeTransportHandlers,
  SseTransportFactory,
  WebSocketTransportFactory
} from './protocols/types'
import type { RealtimeCommandResult, RealtimeSessionRecord } from './types'

function cloneConfig<T extends RealtimeConnectionConfig>(config: T): T {
  return JSON.parse(JSON.stringify(config)) as T
}

function resolveString(value: string, envVars: Record<string, string>): string {
  return resolveVariables(value, { variables: envVars }).value
}

function resolveRealtimeConfig(config: RealtimeConnectionConfig, envVars: Record<string, string>): RealtimeConnectionConfig {
  if (config.protocol === 'mqtt') {
    const nextConfig: MqttRealtimeConfig = {
      ...cloneConfig(config),
      brokerUrl: resolveString(config.brokerUrl, envVars),
      clientId: resolveString(config.clientId, envVars),
      username: resolveString(config.username, envVars),
      password: resolveString(config.password, envVars),
      publishTopic: resolveString(config.publishTopic, envVars),
      subscriptions: config.subscriptions.map((subscription) => ({
        ...subscription,
        value: resolveString(subscription.value, envVars)
      }))
    }
    return nextConfig
  }

  if (config.protocol === 'socketio') {
    const nextConfig: SocketIoRealtimeConfig = {
      ...cloneConfig(config),
      url: resolveString(config.url, envVars),
      namespace: resolveString(config.namespace, envVars),
      eventName: resolveString(config.eventName, envVars),
      authPayload: resolveString(config.authPayload, envVars),
      headers: config.headers.map((header) => ({
        ...header,
        key: resolveString(header.key, envVars),
        value: resolveString(header.value, envVars),
        description: header.description ? resolveString(header.description, envVars) : header.description
      })),
      query: config.query.map((entry) => ({
        ...entry,
        key: resolveString(entry.key, envVars),
        value: resolveString(entry.value, envVars),
        description: entry.description ? resolveString(entry.description, envVars) : entry.description
      }))
    }
    return nextConfig
  }

  if (config.protocol === 'websocket') {
    const nextConfig: WebSocketRealtimeConfig = {
      ...cloneConfig(config),
      url: resolveString(config.url, envVars),
      headers: config.headers.map((header) => ({
        ...header,
        key: resolveString(header.key, envVars),
        value: resolveString(header.value, envVars),
        description: header.description ? resolveString(header.description, envVars) : header.description
      })),
      query: config.query.map((entry) => ({
        ...entry,
        key: resolveString(entry.key, envVars),
        value: resolveString(entry.value, envVars),
        description: entry.description ? resolveString(entry.description, envVars) : entry.description
      }))
    }
    return nextConfig
  }

  const nextConfig: SseRealtimeConfig = {
    ...cloneConfig(config),
    url: resolveString(config.url, envVars),
    headers: config.headers.map((header) => ({
      ...header,
      key: resolveString(header.key, envVars),
      value: resolveString(header.value, envVars),
      description: header.description ? resolveString(header.description, envVars) : header.description
    })),
    query: config.query.map((entry) => ({
      ...entry,
      key: resolveString(entry.key, envVars),
      value: resolveString(entry.value, envVars),
      description: entry.description ? resolveString(entry.description, envVars) : entry.description
    }))
  }
  return nextConfig
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Realtime transport failed.'
}

function createEvent(
  sessionId: string,
  tabId: string,
  protocol: RealtimeProtocol,
  type: RealtimeEventEnvelope['type'],
  payload: string,
  meta?: RealtimeEventEnvelope['meta']
): RealtimeEventEnvelope {
  return {
    sessionId,
    tabId,
    protocol,
    type,
    timestamp: Date.now(),
    payload,
    meta
  }
}

interface RealtimeSessionManagerOptions {
  websocketFactory?: WebSocketTransportFactory
  sseFactory?: SseTransportFactory
}

export class RealtimeSessionManager {
  private readonly sessions = new Map<string, RealtimeSessionRecord>()
  private readonly listeners = new Set<(event: RealtimeEventEnvelope) => void>()
  private readonly websocketFactory: WebSocketTransportFactory
  private readonly sseFactory: SseTransportFactory
  private readonly maxSessions = 10

  constructor(options: RealtimeSessionManagerOptions = {}) {
    this.websocketFactory = options.websocketFactory ?? createWebSocketTransport
    this.sseFactory = options.sseFactory ?? createSseTransport
  }

  onEvent(listener: (event: RealtimeEventEnvelope) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(event: RealtimeEventEnvelope): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('[RealtimeSessionManager] Event listener error:', error)
      }
    }
  }

  private createHandlers(session: RealtimeSessionRecord): RealtimeTransportHandlers {
    return {
      onOpen: () => {
        this.emit(createEvent(session.sessionId, session.tabId, session.protocol, 'connected', 'Realtime transport connected'))
      },
      onMessage: (payload, meta) => {
        this.emit(createEvent(session.sessionId, session.tabId, session.protocol, 'message-in', payload, meta))
      },
      onError: (error) => {
        this.emit(createEvent(session.sessionId, session.tabId, session.protocol, 'error', getErrorMessage(error)))
      },
      onClose: () => {
        const existing = this.sessions.get(session.sessionId)
        if (!existing) return
        this.sessions.delete(session.sessionId)
        this.emit(createEvent(session.sessionId, session.tabId, session.protocol, 'disconnected', 'Realtime transport disconnected'))
      }
    }
  }

  async connect(
    tabId: string,
    config: RealtimeConnectionConfig,
    envVars: Record<string, string> = {}
  ): Promise<RealtimeCommandResult<{ sessionId: string; protocol: RealtimeSessionRecord['protocol'] }>> {
    if (this.sessions.size >= this.maxSessions) {
      return {
        success: false,
        error: {
          code: 'REALTIME_TOO_MANY_SESSIONS',
          message: `Maximum ${this.maxSessions} concurrent sessions allowed`
        },
        events: []
      }
    }

    const sessionId = randomUUID()
    const resolvedConfig = resolveRealtimeConfig(config, envVars)
    const session: RealtimeSessionRecord = {
      sessionId,
      tabId,
      protocol: resolvedConfig.protocol,
      connectedAt: Date.now(),
      config: resolvedConfig
    }

    this.sessions.set(sessionId, session)

    const connectingEvent = createEvent(sessionId, tabId, resolvedConfig.protocol, 'connecting', 'Preparing realtime session')

    try {
      if (resolvedConfig.protocol === 'websocket') {
        session.transport = await this.websocketFactory({
          config: resolvedConfig,
          handlers: this.createHandlers(session)
        })
      } else if (resolvedConfig.protocol === 'sse') {
        session.transport = await this.sseFactory({
          config: resolvedConfig,
          handlers: this.createHandlers(session)
        })
      }

      return {
        success: true,
        data: { sessionId, protocol: resolvedConfig.protocol },
        events: [connectingEvent]
      }
    } catch (error) {
      this.sessions.delete(sessionId)
      return {
        success: false,
        error: {
          code: 'REALTIME_CONNECT_FAILED',
          message: getErrorMessage(error)
        },
        events: [
          connectingEvent,
          createEvent(sessionId, tabId, resolvedConfig.protocol, 'error', getErrorMessage(error)),
          createEvent(sessionId, tabId, resolvedConfig.protocol, 'disconnected', 'Realtime transport disconnected')
        ]
      }
    }
  }

  async disconnect(sessionId: string): Promise<RealtimeCommandResult> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'REALTIME_SESSION_NOT_FOUND',
          message: 'Realtime session was not found.'
        },
        events: []
      }
    }

    this.sessions.delete(sessionId)
    await session.transport?.close?.()

    return {
      success: true,
      data: undefined,
      events: [createEvent(sessionId, session.tabId, session.protocol, 'disconnected', 'Realtime session disconnected')]
    }
  }

  async disconnectByTabId(tabId: string): Promise<RealtimeCommandResult> {
    const session = Array.from(this.sessions.values()).find((item) => item.tabId === tabId)
    if (!session) {
      return {
        success: true,
        data: undefined,
        events: []
      }
    }

    return this.disconnect(session.sessionId)
  }

  async send(sessionId: string, payload: string, meta?: RealtimeEventEnvelope['meta']): Promise<RealtimeCommandResult> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'REALTIME_SESSION_NOT_FOUND',
          message: 'Realtime session was not found.'
        },
        events: []
      }
    }

    if (session.transport?.send) {
      await session.transport.send(payload, meta)
    }

    return {
      success: true,
      data: undefined,
      events: [createEvent(sessionId, session.tabId, session.protocol, 'message-out', payload, meta)]
    }
  }

  async subscribe(sessionId: string, value: string, meta?: RealtimeEventEnvelope['meta']): Promise<RealtimeCommandResult> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'REALTIME_SESSION_NOT_FOUND',
          message: 'Realtime session was not found.'
        },
        events: []
      }
    }

    if (session.transport?.subscribe) {
      await session.transport.subscribe(value, meta)
    }

    return {
      success: true,
      data: undefined,
      events: [createEvent(sessionId, session.tabId, session.protocol, 'subscription-added', value, meta)]
    }
  }

  async unsubscribe(sessionId: string, value: string, meta?: RealtimeEventEnvelope['meta']): Promise<RealtimeCommandResult> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        error: {
          code: 'REALTIME_SESSION_NOT_FOUND',
          message: 'Realtime session was not found.'
        },
        events: []
      }
    }

    if (session.transport?.unsubscribe) {
      await session.transport.unsubscribe(value, meta)
    }

    return {
      success: true,
      data: undefined,
      events: [createEvent(sessionId, session.tabId, session.protocol, 'subscription-removed', value, meta)]
    }
  }

  disconnectAll(): RealtimeEventEnvelope[] {
    const events = Array.from(this.sessions.values(), (session) =>
      createEvent(session.sessionId, session.tabId, session.protocol, 'disconnected', 'Realtime session disconnected')
    )
    this.sessions.clear()
    return events
  }
}
