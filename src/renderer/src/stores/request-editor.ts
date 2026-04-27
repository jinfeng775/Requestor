import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from '@/utils/uuid'
import type { HttpRequestConfig, HttpMethod } from '@/types/request'
import { DEFAULT_REQUEST } from '@/types/request'
import { normalizeRequestConfig } from '@/utils/request-normalize'

/**
 * 请求编辑器状态管理
 * 管理当前正在编辑的请求配置,提供修改、重置和加载功能
 */
export const useRequestEditorStore = defineStore('request-editor', () => {
  /** 当前活动的请求配置 */
  const activeRequest = ref<HttpRequestConfig>({
    ...DEFAULT_REQUEST,
    id: nanoid()
  })

  /** 是否有未保存的更改 */
  const isDirty = ref(false)

  /** 请求来源:集合 ID(从集合加载时设置) */
  const sourceCollectionId = ref<string | null>(null)
  /** 请求来源:集合项 ID(从集合加载时设置) */
  const sourceItemId = ref<string | null>(null)

  /** 是否已输入 URL(用于判断是否可以发送请求) */
  const hasUrl = computed(() => activeRequest.value.url.trim().length > 0)

  /**
   * 设置 HTTP 方法并标记为已修改
   * @param method HTTP 方法(GET/POST/PUT/DELETE等)
   */
  function setMethod(method: HttpMethod): void {
    activeRequest.value = { ...activeRequest.value, method }
    isDirty.value = true
  }

  /**
   * 设置请求 URL 并标记为已修改
   * @param url 请求 URL 字符串
   */
  function setUrl(url: string): void {
    activeRequest.value = { ...activeRequest.value, url }
    isDirty.value = true
  }

  /**
   * 部分更新请求配置并标记为已修改
   * @param partial 要更新的字段对象
   */
  function updateRequest(partial: Partial<HttpRequestConfig>): void {
    activeRequest.value = { ...activeRequest.value, ...partial }
    isDirty.value = true
  }

  /**
   * 创建新的空请求(重置编辑器)
   */
  function newRequest(): void {
    activeRequest.value = normalizeRequestConfig({ ...DEFAULT_REQUEST, id: nanoid() })
    isDirty.value = false
    sourceCollectionId.value = null
    sourceItemId.value = null
  }

  /**
   * 加载现有请求到编辑器
   * 使用深拷贝完全脱离源数据(历史记录、集合项等),防止相互影响
   * @param config 要加载的请求配置
   * @param collectionId 来源集合 ID(从集合加载时传入)
   * @param itemId 来源集合项 ID(从集合加载时传入)
   */
  function loadRequest(config: HttpRequestConfig, collectionId?: string, itemId?: string): void {
    activeRequest.value = normalizeRequestConfig(JSON.parse(JSON.stringify(config)))
    isDirty.value = false
    sourceCollectionId.value = collectionId || null
    sourceItemId.value = itemId || null
  }

  /** 清除请求来源信息(用于非集合来源的加载) */
  function clearSource(): void {
    sourceCollectionId.value = null
    sourceItemId.value = null
  }

  return {
    activeRequest,
    isDirty,
    hasUrl,
    sourceCollectionId,
    sourceItemId,
    setMethod,
    setUrl,
    updateRequest,
    newRequest,
    loadRequest,
    clearSource
  }
})
