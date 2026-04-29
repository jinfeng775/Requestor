import { ipcRenderer } from 'electron'
import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { RealtimeConnectionConfig, RealtimeEventEnvelope } from '../src/renderer/src/types/realtime'

interface RequestResultEnvelope<T> {
  success: boolean
  data?: T
  error?: { message: string; code?: string }
  events?: RealtimeEventEnvelope[]
}

type RealtimeEventListener = (event: RealtimeEventEnvelope) => void

try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
} catch (e) {
  console.error('[preload] Failed to expose electron:', e)
}

const realtimeListenerMap = new Map<RealtimeEventListener, (_event: Electron.IpcRendererEvent, payload: RealtimeEventEnvelope) => void>()

contextBridge.exposeInMainWorld('api', {
  sendRequest: (config: unknown, envVars: Record<string, string> = {}) =>
    ipcRenderer.invoke('request:send', config, envVars),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (defaultName?: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  openJsonFile: () => ipcRenderer.invoke('dialog:openJson'),
  storageLoad: (key: string) => ipcRenderer.invoke('storage:load', key),
  storageSave: (key: string, data: unknown) => ipcRenderer.invoke('storage:save', key, data),
  storageSize: (key: string) => ipcRenderer.invoke('storage:size', key),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  realtimeConnect: (tabId: string, config: RealtimeConnectionConfig, envVars: Record<string, string> = {}) =>
    ipcRenderer.invoke('realtime:connect', tabId, config, envVars) as Promise<RequestResultEnvelope<{ sessionId: string; protocol: RealtimeConnectionConfig['protocol'] }>>,
  realtimeDisconnect: (sessionId: string) =>
    ipcRenderer.invoke('realtime:disconnect', sessionId) as Promise<RequestResultEnvelope<void>>,
  realtimeSend: (sessionId: string, payload: string, meta?: RealtimeEventEnvelope['meta']) =>
    ipcRenderer.invoke('realtime:send', sessionId, payload, meta) as Promise<RequestResultEnvelope<void>>,
  realtimeSubscribe: (sessionId: string, value: string, meta?: RealtimeEventEnvelope['meta']) =>
    ipcRenderer.invoke('realtime:subscribe', sessionId, value, meta) as Promise<RequestResultEnvelope<void>>,
  realtimeUnsubscribe: (sessionId: string, value: string, meta?: RealtimeEventEnvelope['meta']) =>
    ipcRenderer.invoke('realtime:unsubscribe', sessionId, value, meta) as Promise<RequestResultEnvelope<void>>,
  onRealtimeEvent: (listener: RealtimeEventListener) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: RealtimeEventEnvelope) => listener(payload)
    realtimeListenerMap.set(listener, handler)
    ipcRenderer.on('realtime:event', handler)
  },
  offRealtimeEvent: (listener: RealtimeEventListener) => {
    const handler = realtimeListenerMap.get(listener)
    if (!handler) return
    ipcRenderer.off('realtime:event', handler)
    realtimeListenerMap.delete(listener)
  }
})
