import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../src/renderer/src/types/ipc'
import { executeRequest } from '../http/engine'
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
        // 执行 HTTP 请求并传递环境变量
        const result = await executeRequest(config, envVars)
        return { success: true, data: result }
      } catch (error: unknown) {
        // 统一错误处理格式
        const err = error as { message: string; code?: string }
        return {
          success: false,
          error: { message: err.message, code: err.code }
        }
      }
    }
  )
}
