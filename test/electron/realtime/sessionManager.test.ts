import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultRealtimeConfig } from '../../../src/renderer/src/types/realtime.js'
import type { RealtimeEventEnvelope, WebSocketRealtimeConfig } from '../../../src/renderer/src/types/realtime.js'
import { RealtimeSessionManager } from '../../../electron/realtime/sessionManager.js'
import type { RealtimeTransportHandlers } from '../../../electron/realtime/protocols/types.js'

describe('createDefaultRealtimeConfig', () => {
  it('creates protocol-specific websocket defaults without leaking references', () => {
    const first = createDefaultRealtimeConfig('websocket')
    const second = createDefaultRealtimeConfig('websocket')

    assert.equal(first.protocol, 'websocket')
    assert.notEqual(first.headers, second.headers)
    assert.notEqual(first.query, second.query)
  })

  it('creates mqtt defaults with subscriptions and publish fields', () => {
    const config = createDefaultRealtimeConfig('mqtt')

    assert.equal(config.protocol, 'mqtt')
    assert.equal(config.publishTopic, '')
    assert.deepEqual(config.subscriptions, [])
    assert.equal(config.keepaliveSeconds, 60)
  })
})

describe('RealtimeSessionManager', () => {
  it('creates sessions and emits connecting then connected events', async () => {
    const emittedEvents: RealtimeEventEnvelope[] = []
    const manager = new RealtimeSessionManager({
      websocketFactory: async ({ handlers }) => {
        handlers.onOpen()
        return {
          close() {}
        }
      }
    })
    manager.onEvent((event) => {
      emittedEvents.push(event)
    })

    const result = await manager.connect('tab-1', createDefaultRealtimeConfig('websocket'))

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.events.length, 1)
    assert.equal(result.events[0].type, 'connecting')
    assert.equal(result.data.protocol, 'websocket')
    assert.equal(emittedEvents.length, 1)
    assert.equal(emittedEvents[0].type, 'connected')
    assert.equal(emittedEvents[0].sessionId, result.data.sessionId)
  })

  it('resolves environment variables before creating websocket transports', async () => {
    const receivedConfigArray: WebSocketRealtimeConfig[] = []
    const manager = new RealtimeSessionManager({
      websocketFactory: async ({ config, handlers }) => {
        receivedConfigArray.push(config as WebSocketRealtimeConfig)
        handlers.onOpen()
        return {
          close() {}
        }
      }
    })

    const result = await manager.connect(
      'tab-env',
      {
        ...createDefaultRealtimeConfig('websocket'),
        url: 'wss://{{host}}/ws',
        headers: [
          {
            key: 'Authorization',
            value: 'Bearer {{token}}',
            enabled: true
          }
        ],
        query: [
          {
            key: 'client',
            value: '{{client}}',
            enabled: true
          }
        ]
      } as WebSocketRealtimeConfig,
      {
        host: 'socket.example.com',
        token: 'secret-token',
        client: 'requestor-client'
      }
    )

    assert.equal(result.success, true)
    const receivedConfig = receivedConfigArray[0]
    assert.equal(receivedConfig.url, 'wss://socket.example.com/ws')
    assert.equal(receivedConfig.headers[0]?.value, 'Bearer secret-token')
    assert.equal(receivedConfig.query[0]?.value, 'requestor-client')
  })

  it('disconnects sessions by tab id', async () => {
    let closeCalls = 0
    const manager = new RealtimeSessionManager({
      websocketFactory: async ({ handlers }) => {
        handlers.onOpen()
        return {
          close() {
            closeCalls += 1
          }
        }
      }
    })
    const connectResult = await manager.connect('tab-close', createDefaultRealtimeConfig('websocket'))
    assert.equal(connectResult.success, true)
    if (!connectResult.success) return

    const disconnectResult = await manager.disconnectByTabId('tab-close')
    assert.equal(disconnectResult.success, true)
    assert.equal(disconnectResult.events.length, 1)
    assert.equal(disconnectResult.events[0].type, 'disconnected')
    assert.equal(closeCalls, 1)
  })

  it('emits inbound websocket events once a live transport is attached', async () => {
    const emittedEvents: RealtimeEventEnvelope[] = []
    const capturedHandlersArray: RealtimeTransportHandlers[] = []
    const manager = new RealtimeSessionManager({
      websocketFactory: async (context) => {
        capturedHandlersArray.push(context.handlers)
        context.handlers.onOpen()
        return {
          close() {}
        }
      }
    })
    manager.onEvent((event) => {
      emittedEvents.push(event)
    })

    const result = await manager.connect('tab-live-ws', createDefaultRealtimeConfig('websocket'))

    assert.equal(result.success, true)
    if (!result.success) return

    const capturedHandlers = capturedHandlersArray[0]
    capturedHandlers.onMessage('hello from websocket', { source: 'test' })

    assert.ok(emittedEvents.some((event) => event.type === 'message-in' && event.payload === 'hello from websocket'))
  })

  it('streams inbound sse events once a live transport is attached', async () => {
    const emittedEvents: RealtimeEventEnvelope[] = []
    const capturedHandlersArray: RealtimeTransportHandlers[] = []
    const manager = new RealtimeSessionManager({
      sseFactory: async (context) => {
        capturedHandlersArray.push(context.handlers)
        context.handlers.onOpen()
        return {
          close() {}
        }
      }
    })
    manager.onEvent((event) => {
      emittedEvents.push(event)
    })

    const result = await manager.connect('tab-live-sse', createDefaultRealtimeConfig('sse'))

    assert.equal(result.success, true)
    if (!result.success) return

    const capturedHandlers = capturedHandlersArray[0]
    capturedHandlers.onMessage('hello from sse', { event: 'update' })

    assert.ok(emittedEvents.some((event) => event.type === 'message-in' && event.payload === 'hello from sse'))
  })

  it('returns a stable error when sending to an unknown session', async () => {
    const manager = new RealtimeSessionManager()
    const result = await manager.send('missing', 'payload')

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.error.code, 'REALTIME_SESSION_NOT_FOUND')
    assert.equal(result.events.length, 0)
  })

  it('emits outbound and subscription events for active sessions', async () => {
    const sendCalls: Array<{ payload: string; meta?: RealtimeEventEnvelope['meta'] }> = []
    const subscribeCalls: Array<{ value: string; meta?: RealtimeEventEnvelope['meta'] }> = []
    const unsubscribeCalls: Array<{ value: string; meta?: RealtimeEventEnvelope['meta'] }> = []
    const manager = new RealtimeSessionManager({
      websocketFactory: async ({ handlers }) => {
        handlers.onOpen()
        return {
          send(payload, meta) {
            sendCalls.push({ payload, meta })
          },
          subscribe(value, meta) {
            subscribeCalls.push({ value, meta })
          },
          unsubscribe(value, meta) {
            unsubscribeCalls.push({ value, meta })
          },
          close() {}
        }
      }
    })
    const connectResult = await manager.connect('tab-2', createDefaultRealtimeConfig('websocket'))
    assert.equal(connectResult.success, true)
    if (!connectResult.success) return

    const sendResult = await manager.send(connectResult.data.sessionId, '{"hello":true}', { topic: 'demo' })
    assert.equal(sendResult.success, true)
    if (!sendResult.success) return
    assert.equal(sendResult.events[0].type, 'message-out')
    assert.equal(sendResult.events[0].meta?.topic, 'demo')
    assert.deepEqual(sendCalls, [{ payload: '{"hello":true}', meta: { topic: 'demo' } }])

    const subscribeResult = await manager.subscribe(connectResult.data.sessionId, 'devices/+/state', { qos: 1 })
    assert.equal(subscribeResult.success, true)
    if (!subscribeResult.success) return
    assert.equal(subscribeResult.events[0].type, 'subscription-added')
    assert.deepEqual(subscribeCalls, [{ value: 'devices/+/state', meta: { qos: 1 } }])

    const unsubscribeResult = await manager.unsubscribe(connectResult.data.sessionId, 'devices/+/state', { qos: 1 })
    assert.equal(unsubscribeResult.success, true)
    if (!unsubscribeResult.success) return
    assert.equal(unsubscribeResult.events[0].type, 'subscription-removed')
    assert.deepEqual(unsubscribeCalls, [{ value: 'devices/+/state', meta: { qos: 1 } }])

    const disconnectResult = await manager.disconnect(connectResult.data.sessionId)
    assert.equal(disconnectResult.success, true)
    if (!disconnectResult.success) return
    assert.equal(disconnectResult.events[0].type, 'disconnected')
  })
})

