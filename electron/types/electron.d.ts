import { ElectronAPI } from '@electron-toolkit/preload'
import type { HttpRequestConfig, HttpResponseData, RequestError } from '../../src/renderer/src/types/request'

interface API {
  sendRequest(
    config: HttpRequestConfig,
    envVars?: Record<string, string>
  ): Promise<{ success: boolean; data?: HttpResponseData; error?: RequestError }>
  openFile(): Promise<string | null>
  saveFile(defaultName?: string): Promise<string | null>
  openJsonFile(): Promise<string | null>
  storageLoad(key: string): Promise<unknown>
  storageSave(key: string, data: unknown): Promise<boolean>
  storageSize(key: string): Promise<number>
  readFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }>
  writeFile(filePath: string, content: string): Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
