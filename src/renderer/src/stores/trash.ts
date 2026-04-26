import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loadData, saveData, migrateFromLocalStorage } from '@/utils/storage'
import type { Collection } from '@/types/collection'

/** 回收站中的集合项 */
export interface TrashedCollection {
  collection: Collection
  deletedAt: number // 删除时间戳
}

const STORAGE_KEY = 'requestor-trash'
const AUTO_CLEAR_DAYS = 30 // 自动清理超过 30 天的记录

/**
 * 集合回收站状态管理
 * 提供软删除功能,允许用户恢复误删的集合,并自动清理过期记录
 */
export const useTrashStore = defineStore('trash', () => {
  /** 回收站中的集合列表 */
  const items = ref<TrashedCollection[]>([])
  let loaded = false // 标记是否已从磁盘加载

  function trashCollection(collection: Collection): void {
    items.value = [{ collection, deletedAt: Date.now() }, ...items.value]
    persist()
  }

  function restore(id: string): Collection | null {
    const idx = items.value.findIndex((t) => t.collection.id === id)
    if (idx < 0) return null
    const restored = items.value[idx].collection
    items.value = items.value.filter((t) => t.collection.id !== id)
    persist()
    return restored
  }

  function permanentlyDelete(id: string): void {
    items.value = items.value.filter((t) => t.collection.id !== id)
    persist()
  }

  function clearAll(): void {
    items.value = []
    persist()
  }

  function autoClear(): void {
    const cutoff = Date.now() - AUTO_CLEAR_DAYS * 24 * 60 * 60 * 1000
    const before = items.value.length
    items.value = items.value.filter((t) => t.deletedAt > cutoff)
    if (items.value.length !== before) persist()
  }

  /** 持久化到文件系统 */
  function persist(): void {
    if (!loaded) return
    saveData(STORAGE_KEY, items.value)
  }

  /** 从文件系统加载回收站数据 */
  async function loadFromDisk(): Promise<void> {
    await migrateFromLocalStorage(STORAGE_KEY, 'mypostman-trash')
    const data = await loadData<TrashedCollection[]>(STORAGE_KEY, [])
    if (Array.isArray(data)) {
      items.value = data
    }
    loaded = true
    autoClear()
  }

  return { items, trashCollection, restore, permanentlyDelete, clearAll, loadFromDisk }
})
