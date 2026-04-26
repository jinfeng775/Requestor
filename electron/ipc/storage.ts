import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../src/renderer/src/types/ipc'
import { readData, writeData, getFileSize } from '../store/storage'

/**
 * 注册持久化存储的 IPC 处理器
 * 封装读写操作,提供统一的错误处理
 */
export function registerStorageIpc(): void {
  // 加载数据
  ipcMain.handle(IPC_CHANNELS.STORAGE_LOAD, (_event, key: string) => {
    return readData(key, null)
  })

  // 保存数据
  ipcMain.handle(IPC_CHANNELS.STORAGE_SAVE, (_event, key: string, data: unknown) => {
    writeData(key, data)
    return true
  })

  // 获取文件大小
  ipcMain.handle(IPC_CHANNELS.STORAGE_SIZE, (_event, key: string) => {
    return getFileSize(key)
  })
}
