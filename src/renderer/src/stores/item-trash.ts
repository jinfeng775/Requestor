import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from '@/utils/uuid'
import { loadData, saveData, migrateFromLocalStorage } from '@/utils/storage'
import type { CollectionRequest } from '@/types/collection'
import { useCollectionStore } from './collection'

/** 回收站中的请求项 */
export interface TrashedItem {
  id: string // 回收站条目 ID
  item: CollectionRequest // 被删除的请求
  collectionId: string // 所属集合 ID
  collectionName: string // 所属集合名称(用于恢复时重建集合)
  deletedAt: number // 删除时间戳
}

const STORAGE_KEY = 'requestor-item-trash'
const AUTO_CLEAR_DAYS = 30 // 自动清理超过 30 天的记录

/**
 * 请求项回收站状态管理
 * 提供请求级别的软删除功能,支持恢复到原集合或重建已删除的集合
 */
export const useItemTrashStore = defineStore('item-trash', () => {
  /** 回收站中的请求列表 */
  const items = ref<TrashedItem[]>([])
  let loaded = false // 标记是否已从磁盘加载

  function trashItem(item: CollectionRequest, collectionId: string, collectionName: string): void {
    items.value = [
      { id: nanoid(), item, collectionId, collectionName, deletedAt: Date.now() },
      ...items.value
    ]
    persist()
  }

  function restore(id: string): void {
    const idx = items.value.findIndex((t) => t.id === id)
    if (idx < 0) return
    const entry = items.value[idx]
    const collectionStore = useCollectionStore()

    const existing = collectionStore.collections.find((c) => c.id === entry.collectionId)
    if (existing) {
      collectionStore.addRequestDirect(entry.collectionId, entry.item)
    } else {
      collectionStore.restore({
        id: entry.collectionId,
        name: entry.collectionName,
        description: '',
        items: [entry.item],
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }

    items.value = items.value.filter((t) => t.id !== id)
    persist()
  }

  function permanentlyDelete(id: string): void {
    items.value = items.value.filter((t) => t.id !== id)
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
    await migrateFromLocalStorage(STORAGE_KEY, 'mypostman-item-trash')
    const data = await loadData<TrashedItem[]>(STORAGE_KEY, [])
    if (Array.isArray(data)) {
      items.value = data
    }
    loaded = true
    autoClear()
  }

  return { items, trashItem, restore, permanentlyDelete, clearAll, loadFromDisk }
})
