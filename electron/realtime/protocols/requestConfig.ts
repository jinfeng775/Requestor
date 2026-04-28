import type { KeyValue } from '../../../src/renderer/src/types/request'

export function buildRealtimeUrl(baseUrl: string, query: KeyValue[]): string {
  try {
    const url = new URL(baseUrl)

    if (url.protocol === 'file:' || url.protocol === 'javascript:') {
      throw new Error(`Unsupported protocol: ${url.protocol}`)
    }

    for (const entry of query) {
      if (!entry.enabled || !entry.key) continue
      url.searchParams.append(entry.key, entry.value)
    }

    return url.toString()
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function buildRealtimeHeaders(headers: KeyValue[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((result, entry) => {
    if (!entry.enabled || !entry.key) return result
    return {
      ...result,
      [entry.key]: entry.value
    }
  }, {})
}
