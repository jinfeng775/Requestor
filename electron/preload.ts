import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 暴露 Electron API 到渲染进程
// 使用 contextBridge 确保安全性,防止直接访问 Node.js API
try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
} catch (e) {
  console.error('[preload] Failed to expose electron:', e)
}

/**
 * 暴露自定义 API 到渲染进程的 window.api 对象
 * 每个方法都通过 IPC 与主进程通信
 */
contextBridge.exposeInMainWorld('api', {
  /** 发送 HTTP 请求 */
  sendRequest: (config: unknown, envVars: Record<string, string> = {}) =>
    ipcRenderer.invoke('request:send', config, envVars),

  /** 打开文件选择对话框 */
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  /** 保存文件对话框 */
  saveFile: (defaultName?: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),

  /** 打开 JSON 文件选择对话框 */
  openJsonFile: () => ipcRenderer.invoke('dialog:openJson'),

  /** 加载持久化数据 */
  storageLoad: (key: string) => ipcRenderer.invoke('storage:load', key),

  /** 保存持久化数据 */
  storageSave: (key: string, data: unknown) => ipcRenderer.invoke('storage:save', key, data),

  /** 获取文件大小 */
  storageSize: (key: string) => ipcRenderer.invoke('storage:size', key),

  /** 读取文件内容 */
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

  /** 写入文件内容 */
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content)
})
