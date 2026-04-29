import { parseSseChunk } from '../parseSse'
import { buildRealtimeHeaders, buildRealtimeUrl } from './requestConfig'
import type { RealtimeTransport, SseTransportContext } from './types'

export async function createSseTransport(context: SseTransportContext): Promise<RealtimeTransport> {
  const controller = new AbortController()
  const response = await fetch(buildRealtimeUrl(context.config.url, context.config.query), {
    method: 'GET',
    headers: buildRealtimeHeaders(context.config.headers),
    signal: controller.signal
  })

  if (!response.ok) {
    throw new Error(`SSE request failed with status ${response.status}.`)
  }

  if (!response.body) {
    throw new Error('SSE response body is not available.')
  }

  context.handlers.onOpen()

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  const streamingPromise = (async () => {
    let remaining = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const result = parseSseChunk(chunk, remaining)
        remaining = result.remaining

        for (const event of result.events) {
          context.handlers.onMessage(event.data, { event: event.event })
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        context.handlers.onError(error)
      }
    } finally {
      context.handlers.onClose()
    }
  })()

  return {
    async close() {
      controller.abort()
      try {
        await reader.cancel()
      } catch (error) {
        if (!controller.signal.aborted) {
          throw error
        }
      }
      await streamingPromise
    }
  }
}
