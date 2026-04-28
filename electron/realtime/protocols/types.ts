import type { RealtimeEventEnvelope, SseRealtimeConfig, WebSocketRealtimeConfig } from '../../../src/renderer/src/types/realtime'

export interface RealtimeTransport {
  send?: (payload: string, meta?: RealtimeEventEnvelope['meta']) => Promise<void> | void
  subscribe?: (value: string, meta?: RealtimeEventEnvelope['meta']) => Promise<void> | void
  unsubscribe?: (value: string, meta?: RealtimeEventEnvelope['meta']) => Promise<void> | void
  close: () => Promise<void> | void
}

export interface RealtimeTransportHandlers {
  onOpen: () => void
  onMessage: (payload: string, meta?: RealtimeEventEnvelope['meta']) => void
  onError: (error: unknown) => void
  onClose: () => void
}

export interface WebSocketTransportContext {
  config: WebSocketRealtimeConfig
  handlers: RealtimeTransportHandlers
}

export interface SseTransportContext {
  config: SseRealtimeConfig
  handlers: RealtimeTransportHandlers
}

export type WebSocketTransportFactory = (context: WebSocketTransportContext) => Promise<RealtimeTransport>
export type SseTransportFactory = (context: SseTransportContext) => Promise<RealtimeTransport>
