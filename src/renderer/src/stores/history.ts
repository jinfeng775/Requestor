import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from '@/utils/uuid'
import { loadData, saveData, migrateFromLocalStorage } from '@/utils/storage'
import { normalizeRequestConfig } from '@/utils/request-normalize'
import type { HistoryEntry } from '@/types/history'
import type { HttpRequestConfig, HttpResponseData } from '@/types/request'

const STORAGE_KEY = 'requestor-history'
const MAX_ENTRIES = 500 // 最大历史记录数量

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<HistoryEntry[]>([])
  let loaded = false

  /**
   * 添加历史记录(最新在前,超出限制自动截断)
   * @param request 请求配置
   * @param response 响应数据(可选，完整或摘要)
   * @param error 错误信息(可选)
   */
  function addEntry(
    request: HttpRequestConfig,
    response: HttpResponseData | null,
    error?: string
  ): void {
    const entry: HistoryEntry = {
      id: nanoid(),
      request: normalizeRequestConfig(JSON.parse(JSON.stringify(request))),
      response: response
        ? {
            status: response.status,
            statusText: response.statusText,
            totalTime: response.totalTime,
            bodySize: response.bodySize
          }
        : null,
      responseBody: response?.body,
      responseHeaders: response?.headers,
      responseHeaderSize: response?.headerSize,
      responseCookies: response?.cookies,
      responseContentType: response?.contentType,
      responseNetworkDetails: response?.networkDetails,
      error,
      timestamp: Date.now()
    }
    entries.value = [entry, ...entries.value].slice(0, MAX_ENTRIES)
    persist()
  }

  /** 删除单条历史记录 */
  function deleteEntry(id: string): void {
    entries.value = entries.value.filter((e) => e.id !== id)
    persist()
  }

  /** 清空所有历史记录 */
  function clearAll(): void {
    entries.value = []
    persist()
  }

  /** 持久化到文件系统 */
  function persist(): void {
    if (!loaded) return
    saveData(STORAGE_KEY, entries.value)
  }

  /** 从文件系统加载历史记录 */
  async function loadFromDisk(): Promise<void> {
    await migrateFromLocalStorage(STORAGE_KEY, 'mypostman-history')
    const data = await loadData<HistoryEntry[]>(STORAGE_KEY, [])
    if (Array.isArray(data)) {
      entries.value = data.map((entry) => ({
        ...entry,
        request: normalizeRequestConfig(JSON.parse(JSON.stringify(entry.request)))
      }))
    }
    loaded = true
  }

  return { entries, addEntry, deleteEntry, clearAll, loadFromDisk }
})
