export interface ParsedSseEvent {
  event: string
  data: string
}

export interface ParseSseChunkResult {
  events: ParsedSseEvent[]
  remaining: string
}

function parseEventBlock(block: string): ParsedSseEvent | null {
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue

    const separatorIndex = line.indexOf(':')
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') {
      eventName = value || 'message'
      continue
    }

    if (field === 'data') {
      dataLines.push(value)
    }
  }

  if (dataLines.length === 0) return null

  return {
    event: eventName,
    data: dataLines.join('\n')
  }
}

export function parseSseChunk(chunk: string, buffer = ''): ParseSseChunkResult {
  const normalized = `${buffer}${chunk}`.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const segments = normalized.split('\n\n')
  const remaining = segments.pop() ?? ''
  const events = segments
    .map((segment) => parseEventBlock(segment))
    .filter((event): event is ParsedSseEvent => event !== null)

  return {
    events,
    remaining
  }
}
