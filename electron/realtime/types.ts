import type { RealtimeCommandError, RealtimeConnectionConfig, RealtimeConnectResult, RealtimeEventEnvelope, RealtimeProtocol } from '../../src/renderer/src/types/realtime'
import type { RealtimeTransport } from './protocols/types'

export interface RealtimeSessionRecord {
  sessionId: string
  tabId: string
  protocol: RealtimeProtocol
  connectedAt: number
  config: RealtimeConnectionConfig
  transport?: RealtimeTransport
}

export interface RealtimeCommandSuccess<T = undefined> {
  success: true
  data: T
  events: RealtimeEventEnvelope[]
}

export interface RealtimeCommandFailure {
  success: false
  error: RealtimeCommandError
  events: RealtimeEventEnvelope[]
}

export type RealtimeCommandResult<T = undefined> = RealtimeCommandSuccess<T> | RealtimeCommandFailure
