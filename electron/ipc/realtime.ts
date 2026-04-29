import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../src/renderer/src/types/ipc'
import type { RealtimeConnectionConfig, RealtimeEventEnvelope } from '../../src/renderer/src/types/realtime'
import { RealtimeSessionManager } from '../realtime/sessionManager'

const realtimeSessionManager = new RealtimeSessionManager()

const stopListening = realtimeSessionManager.onEvent((event) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send(IPC_CHANNELS.REALTIME_EVENT, event)
  }
})

function emitEvents(window: BrowserWindow | null, events: RealtimeEventEnvelope[]): void {
  if (!window || window.isDestroyed()) return
  for (const event of events) {
    window.webContents.send(IPC_CHANNELS.REALTIME_EVENT, event)
  }
}

export function registerRealtimeIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.REALTIME_CONNECT,
    async (event, tabId: string, config: RealtimeConnectionConfig, envVars: Record<string, string> = {}) => {
      const owner = BrowserWindow.fromWebContents(event.sender)
      const result = await realtimeSessionManager.connect(tabId, config, envVars)
      emitEvents(owner, result.events)
      return result
    }
  )

  ipcMain.handle(IPC_CHANNELS.REALTIME_DISCONNECT, async (event, sessionId: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const result = await realtimeSessionManager.disconnect(sessionId)
    emitEvents(owner, result.events)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.REALTIME_SEND, async (event, sessionId: string, payload: string, meta?: RealtimeEventEnvelope['meta']) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const result = await realtimeSessionManager.send(sessionId, payload, meta)
    emitEvents(owner, result.events)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.REALTIME_SUBSCRIBE, async (event, sessionId: string, value: string, meta?: RealtimeEventEnvelope['meta']) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const result = await realtimeSessionManager.subscribe(sessionId, value, meta)
    emitEvents(owner, result.events)
    return result
  })

  ipcMain.handle(IPC_CHANNELS.REALTIME_UNSUBSCRIBE, async (event, sessionId: string, value: string, meta?: RealtimeEventEnvelope['meta']) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const result = await realtimeSessionManager.unsubscribe(sessionId, value, meta)
    emitEvents(owner, result.events)
    return result
  })
}

export async function disconnectRealtimeTab(tabId: string): Promise<RealtimeEventEnvelope[]> {
  return (await realtimeSessionManager.disconnectByTabId(tabId)).events
}

export function disconnectAllRealtimeSessions(): void {
  stopListening()
  realtimeSessionManager.disconnectAll()
}
