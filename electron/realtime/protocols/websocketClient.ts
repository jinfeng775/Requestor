import { buildRealtimeUrl } from './requestConfig'
import type { RealtimeTransport, WebSocketTransportContext } from './types'

function getWebSocketConstructor(): typeof WebSocket {
  if (typeof WebSocket === 'function') return WebSocket
  throw new Error('WebSocket is not available in the Electron main process.')
}

function normalizeMessageData(data: unknown): string {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8')
  return String(data)
}

export async function createWebSocketTransport(context: WebSocketTransportContext): Promise<RealtimeTransport> {
  const WebSocketConstructor = getWebSocketConstructor()
  const url = buildRealtimeUrl(context.config.url, context.config.query)
  const socket = new WebSocketConstructor(url, context.config.subprotocols.length > 0 ? context.config.subprotocols : undefined)

  const handleOpen = () => context.handlers.onOpen()
  const handleMessage = (event: MessageEvent) => context.handlers.onMessage(normalizeMessageData(event.data))
  const handleError = () => context.handlers.onError(new Error('WebSocket connection failed.'))
  const handleClose = () => context.handlers.onClose()

  socket.addEventListener('open', handleOpen)
  socket.addEventListener('message', handleMessage)
  socket.addEventListener('error', handleError)
  socket.addEventListener('close', handleClose)

  return {
    send(payload) {
      try {
        if (socket.readyState !== WebSocket.OPEN) {
          throw new Error('WebSocket is not open')
        }
        socket.send(payload)
      } catch (error) {
        context.handlers.onError(error)
        throw error
      }
    },
    close() {
      socket.removeEventListener('open', handleOpen)
      socket.removeEventListener('message', handleMessage)
      socket.removeEventListener('error', handleError)
      socket.removeEventListener('close', handleClose)
      socket.close()
    }
  }
}
