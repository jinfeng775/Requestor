import { randomUUID } from 'crypto'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function resolveDynamicVariable(name: string, now: Date = new Date()): string | null {
  switch (name) {
    case '$guid':
    case '$uuid':
    case '$randomUUID':
      return randomUUID()
    case '$timestamp':
      return Math.floor(now.getTime() / 1000).toString()
    case '$isoTimestamp':
      return now.toISOString()
    case '$yyyy':
      return now.getFullYear().toString()
    case '$MM':
      return pad(now.getMonth() + 1)
    case '$dd':
      return pad(now.getDate())
    case '$HH':
      return pad(now.getHours())
    case '$mm':
      return pad(now.getMinutes())
    case '$ss':
      return pad(now.getSeconds())
    default:
      return null
  }
}
