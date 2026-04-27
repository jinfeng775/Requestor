import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../src/renderer/src/types/ipc'
import { executeRequestWithScripts } from '../http/requestPipeline'
import { confirmRequestScriptTrust } from '../http/scripts/trust'
import type { HttpRequestConfig } from '../../src/renderer/src/types/request'

/**
 * 注册 HTTP 请求相关的 IPC 处理器
 * 统一返回 {success, data/error} 格式,便于渲染进程处理
 */
export function registerRequestIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.REQUEST_SEND,
    async (_event, config: HttpRequestConfig, envVars: Record<string, string> = {}) => {
      try {
        const owner = BrowserWindow.fromWebContents(_event.sender)
        const result = await executeRequestWithScripts(config, envVars, {
          trustScripts: (request, scriptHash, trustScope) =>
            confirmRequestScriptTrust(owner, request, scriptHash, trustScope)
        })
        if (result.success) {
          return { success: true, data: result.data }
        }

        return {
          success: false,
          error: result.error
        }
      } catch (error: unknown) {
        const err = error as { message: string; code?: string }
        return {
          success: false,
          error: { message: err.message, code: err.code }
        }
      }
    }
  )
}
