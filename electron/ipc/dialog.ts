import { ipcMain, dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../../src/renderer/src/types/ipc'

/**
 * 注册文件对话框相关的 IPC 处理器
 * 提供打开文件、保存文件和打开 JSON 文件的功能
 */
export function registerDialogIpc(): void {
  // 打开任意文件
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // 保存文件(默认 JSON 格式)
  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_FILE, async (_event, defaultName?: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName || 'export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  // 打开 JSON 文件(带文件类型过滤)
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_JSON, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // 读取文件内容
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      return { success: true, content: readFileSync(filePath, 'utf-8') }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Read failed'
      return { success: false, error: message }
    }
  })

  // 写入文件内容
  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Write failed'
      return { success: false, error: message }
    }
  })
}
