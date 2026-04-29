/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

type RequestResultEnvelope<T> = {
  success: boolean
  data?: T
  error?: { message: string; code?: string }
}

type FileDialogResult = string | null

type FileReadResult =
  | {
      success: true
      content: string
    }
  | {
      success: false
      error: string
    }

type FileWriteResult =
  | {
      success: true
    }
  | {
      success: false
      error: string
    }

declare global {
  interface Window {
    api: {
      sendRequest: (
        config: import('./types/request').HttpRequestConfig,
        envVars?: Record<string, string>
      ) => Promise<RequestResultEnvelope<import('./types/request').HttpResponseData>>
      openFile: () => Promise<FileDialogResult>
      saveFile: (defaultName?: string) => Promise<FileDialogResult>
      openJsonFile: () => Promise<FileDialogResult>
      storageLoad: <T = unknown>(key: string) => Promise<T>
      storageSave: (key: string, data: unknown) => Promise<boolean>
      storageSize: (key: string) => Promise<number>
      readFile: (filePath: string) => Promise<FileReadResult>
      writeFile: (filePath: string, content: string) => Promise<FileWriteResult>
      realtimeConnect: (
        tabId: string,
        config: import('./types/realtime').RealtimeConnectionConfig,
        envVars?: Record<string, string>
      ) => Promise<RequestResultEnvelope<import('./types/realtime').RealtimeConnectResult>>
      realtimeDisconnect: (sessionId: string) => Promise<RequestResultEnvelope<void>>
      realtimeSend: (
        sessionId: string,
        payload: string,
        meta?: import('./types/realtime').RealtimeEventEnvelope['meta']
      ) => Promise<RequestResultEnvelope<void>>
      realtimeSubscribe: (
        sessionId: string,
        value: string,
        meta?: import('./types/realtime').RealtimeEventEnvelope['meta']
      ) => Promise<RequestResultEnvelope<void>>
      realtimeUnsubscribe: (
        sessionId: string,
        value: string,
        meta?: import('./types/realtime').RealtimeEventEnvelope['meta']
      ) => Promise<RequestResultEnvelope<void>>
      onRealtimeEvent: (listener: (event: import('./types/realtime').RealtimeEventEnvelope) => void) => void
      offRealtimeEvent: (listener: (event: import('./types/realtime').RealtimeEventEnvelope) => void) => void
    }
  }
}

export {}
