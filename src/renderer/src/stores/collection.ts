import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from '@/utils/uuid'
import { loadData, saveData, migrateFromLocalStorage } from '@/utils/storage'
import { normalizeRequestConfig } from '@/utils/request-normalize'
import type { Collection, CollectionItem, CollectionRequest, ResponseExample } from '@/types/collection'
import type { HttpRequestConfig } from '@/types/request'

const STORAGE_KEY = 'requestor-collections'

export const useCollectionStore = defineStore('collection', () => {
  const collections = ref<Collection[]>([])
  let loaded = false // 标记是否已从磁盘加载,防止未加载时写入

  /** 创建新集合 */
  function createCollection(name: string): Collection {
    const collection: Collection = {
      id: nanoid(),
      name,
      description: '',
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    collections.value = [...collections.value, collection]
    persist()
    return collection
  }

  /**
   * 删除集合并返回被删除的对象(用于回收站)
   * @param id 集合 ID
   * @returns 被删除的集合或 null
   */
  function deleteCollection(id: string): Collection | null {
    const found = collections.value.find((c) => c.id === id) || null
    collections.value = collections.value.filter((c) => c.id !== id)
    persist()
    return found
  }

  /** 重命名集合 */
  function renameCollection(id: string, name: string): void {
    collections.value = collections.value.map((c) =>
      c.id === id ? { ...c, name, updatedAt: Date.now() } : c
    )
    persist()
  }

  /**
   * 向集合添加请求(从 HttpRequestConfig 转换)
   * @param collectionId 集合 ID
   * @param name 请求名称
   * @param request 请求配置
   */
  function addRequest(collectionId: string, name: string, request: HttpRequestConfig): CollectionRequest {
    const newItem: CollectionRequest = {
      id: nanoid(),
      type: 'request',
      name,
      request: normalizeRequestConfig(JSON.parse(JSON.stringify(request)))
    }
    collections.value = collections.value.map((c) => {
      if (c.id !== collectionId) return c
      return {
        ...c,
        items: [newItem, ...c.items],
        updatedAt: Date.now()
      }
    })
    persist()
    return newItem
  }

  /** 直接添加 CollectionRequest 对象 */
  function addRequestDirect(collectionId: string, item: CollectionRequest): void {
    const normalizedItem: CollectionRequest = {
      ...item,
      request: normalizeRequestConfig(JSON.parse(JSON.stringify(item.request)))
    }
    collections.value = collections.value.map((c) => {
      if (c.id !== collectionId) return c
      return {
        ...c,
        items: [normalizedItem, ...c.items],
        updatedAt: Date.now()
      }
    })
    persist()
  }

  /**
   * 向集合中的请求项添加响应示例
   */
  function addResponseExample(collectionId: string, itemId: string, example: ResponseExample): void {
    collections.value = collections.value.map((c) => {
      if (c.id !== collectionId) return c
      return {
        ...c,
        items: c.items.map((item) => {
          if (item.id !== itemId || item.type !== 'request') return item
          const existing = item.responseExamples || []
          // 同一状态码只保留最新的一条响应示例
          const filtered = existing.filter((e) => e.status !== example.status)
          return { ...item, responseExamples: [example, ...filtered] }
        }),
        updatedAt: Date.now()
      }
    })
    persist()
  }

  /**
   * 更新集合中的请求配置
   * @param collectionId 集合 ID
   * @param itemId 请求项 ID
   * @param request 新的请求配置
   */
  function updateRequestConfig(collectionId: string, itemId: string, request: HttpRequestConfig): void {
    collections.value = collections.value.map((c) => {
      if (c.id !== collectionId) return c
      return {
        ...c,
        items: c.items.map((item) => {
          if (item.id !== itemId || item.type !== 'request') return item
          return { ...item, request: normalizeRequestConfig(JSON.parse(JSON.stringify(request))) }
        }),
        updatedAt: Date.now()
      }
    })
    persist()
  }

  /**
   * 删除集合中请求项的响应示例
   */
  function deleteResponseExample(collectionId: string, itemId: string, exampleId: string): void {
    collections.value = collections.value.map((c) => {
      if (c.id !== collectionId) return c
      return {
        ...c,
        items: c.items.map((item) => {
          if (item.id !== itemId || item.type !== 'request') return item
          const examples = (item.responseExamples || []).filter((e) => e.id !== exampleId)
          return { ...item, responseExamples: examples }
        }),
        updatedAt: Date.now()
      }
    })
    persist()
  }

  /** 从回收站恢复集合 */
  function restore(collection: Collection, options: { trustScripts?: boolean } = {}): void {
    collections.value = [
      ...collections.value,
      {
        ...collection,
        items: normalizeCollectionItems(collection.items, options)
      }
    ]
    persist()
  }

  /** 删除集合中的单个请求项 */
  function deleteItem(collectionId: string, itemId: string): void {
    collections.value = collections.value.map((c) => {
      if (c.id !== collectionId) return c
      return { ...c, items: c.items.filter((i) => i.id !== itemId), updatedAt: Date.now() }
    })
    persist()
  }

  /**
   * 将请求项从一个集合移动到另一个集合（或在同一集合内排序）
   * vuedraggable 会直接通过 list 绑定修改数组,此函数作为备用的编程式移动 API
   */
  function moveItem(fromCollectionId: string, toCollectionId: string, itemId: string, newIndex = 0): void {
    // 1. 从源集合取出项
    let movedItem: CollectionRequest | null = null
    collections.value = collections.value.map((c) => {
      if (c.id !== fromCollectionId) return c
      const item = c.items.find((i) => i.id === itemId)
      if (!item || item.type !== 'request') return c
      movedItem = item as CollectionRequest
      return { ...c, items: c.items.filter((i) => i.id !== itemId), updatedAt: Date.now() }
    })
    if (!movedItem) return

    // 2. 插入目标集合
    collections.value = collections.value.map((c) => {
      if (c.id !== toCollectionId) return c
      const items = [...c.items]
      items.splice(newIndex, 0, movedItem!)
      return { ...c, items, updatedAt: Date.now() }
    })
    persist()
  }

  /** 重命名集合中的请求项 */
  function renameItem(collectionId: string, itemId: string, name: string): void {
    collections.value = collections.value.map((c) => {
      if (c.id !== collectionId) return c
      return {
        ...c,
        items: c.items.map((i) => (i.id === itemId ? { ...i, name } : i)),
        updatedAt: Date.now()
      }
    })
    persist()
  }

  /** 持久化到文件系统 */
  function persist(): void {
    if (!loaded) return
    saveData(STORAGE_KEY, collections.value)
  }

  /** 手动触发持久化（用于外部直接修改 collections 后） */
  function triggerPersist(): void {
    persist()
  }

  function normalizeCollectionItems(
    items: CollectionItem[],
    options: { trustScripts?: boolean } = {}
  ): CollectionItem[] {
    return items.map<CollectionItem>((item) => {
      if (item.type === 'folder') {
        return { ...item, items: normalizeCollectionItems(item.items, options) }
      }

      return {
        ...item,
        request: normalizeRequestConfig(JSON.parse(JSON.stringify(item.request)), options)
      }
    })
  }

  /** 从文件系统加载集合数据 */
  async function loadFromDisk(): Promise<void> {
    await migrateFromLocalStorage(STORAGE_KEY, 'mypostman-collections')
    const data = await loadData<Collection[]>(STORAGE_KEY, [])
    if (Array.isArray(data)) {
      collections.value = data.map((collection) => ({
        ...collection,
        items: normalizeCollectionItems(collection.items)
      }))
    }
    loaded = true
  }

  return {
    collections,
    createCollection,
    deleteCollection,
    renameCollection,
    restore,
    addRequest,
    addRequestDirect,
    addResponseExample,
    updateRequestConfig,
    deleteResponseExample,
    deleteItem,
    moveItem,
    renameItem,
    triggerPersist,
    loadFromDisk
  }
})
