import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from '@/utils/uuid'
import type { HttpRequestConfig } from '@/types/request'
import { DEFAULT_REQUEST } from '@/types/request'

/** 标签页数据结构 */
export interface Tab {
  id: string // 标签唯一标识
  name: string // 标签名称(自动生成或手动设置)
  request: HttpRequestConfig // 请求配置
  hasUnsavedChanges: boolean // 是否有未保存的更改
}

const UNNAMED = 'Untitled'

/**
 * 从请求配置自动生成标签名称
 * 降级策略:完整 URL -> 路径最后两段 -> hostname
 * @param request 请求配置
 * @returns 自动生成的标签名称
 */
function deriveTabName(request: HttpRequestConfig): string {
  if (!request.url) return UNNAMED
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const last = segments.slice(-2).join('/') // 取最后两段路径
    return `${request.method} /${last || url.hostname}`
  } catch {
    // 不是完整 URL — 尝试提取路径
    const pathPart = request.url.split('?')[0]
    const segments = pathPart.split('/').filter(Boolean)
    const last = segments.slice(-2).join('/')
    return `${request.method} /${last || request.url}`
  }
}

export const useTabStore = defineStore('tab', () => {
  const tabs = ref<Tab[]>([])
  const activeTabId = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeTabId.value) || null)

  /**
   * 创建新标签页,支持克隆现有请求
   * @param request 可选的请求配置(默认创建空请求)
   * @param name 可选的标签名称(默认自动生成)
   * @returns 新创建的标签对象
   */
  function createTab(request?: HttpRequestConfig, name?: string): Tab {
    const req = request ? JSON.parse(JSON.stringify(request)) : { ...DEFAULT_REQUEST, id: nanoid() }
    const tab: Tab = {
      id: nanoid(),
      name: name || deriveTabName(req),
      request: req,
      hasUnsavedChanges: false
    }
    tabs.value = [...tabs.value, tab]
    activeTabId.value = tab.id
    return tab
  }

  /**
   * 关闭标签页并智能切换到相邻标签
   * @param id 要关闭的标签 ID
   */
  function closeTab(id: string): void {
    const idx = tabs.value.findIndex((t) => t.id === id)
    tabs.value = tabs.value.filter((t) => t.id !== id)
    if (activeTabId.value === id) {
      if (tabs.value.length > 0) {
        // 切换到相邻标签(优先右侧,否则左侧)
        const nextIdx = Math.min(idx, tabs.value.length - 1)
        activeTabId.value = tabs.value[nextIdx].id
      } else {
        activeTabId.value = null
      }
    }
  }

  /** 激活指定标签 */
  function setActiveTab(id: string): void {
    activeTabId.value = id
  }

  /** 复制当前标签页 */
  function duplicateTab(id: string): Tab | null {
    const source = tabs.value.find((t) => t.id === id)
    if (!source) return null
    return createTab(source.request, source.name + ' (copy)')
  }

  /**
   * 更新标签的请求配置,自动重命名(除非手动修改过)
   * @param id 标签 ID
   * @param request 新的请求配置
   */
  function updateTabRequest(id: string, request: HttpRequestConfig): void {
    tabs.value = tabs.value.map((t) => {
      if (t.id !== id) return t
      const req = JSON.parse(JSON.stringify(request))
      // 仅当名称是自动生成的才自动重命名
      const autoName = deriveTabName(req)
      const isManual = t.name !== UNNAMED && t.name !== deriveTabName(t.request)
      return { ...t, request: req, name: isManual ? t.name : autoName, hasUnsavedChanges: true }
    })
  }

  /** 手动更新标签名称 */
  function updateTabName(id: string, name: string): void {
    tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, name } : t))
  }

  /**
   * 加载请求到标签(去重逻辑:相同 URL+Method 复用标签)
   * @param request 请求配置
   * @param name 可选的标签名称
   */
  function loadRequest(request: HttpRequestConfig, name?: string): void {
    const existing = tabs.value.find(
      (t) => t.request.url === request.url && t.request.method === request.method
    )
    if (existing) {
      activeTabId.value = existing.id // 复用已有标签
    } else {
      createTab(request, name) // 创建新标签
    }
  }

  /** 初始化:如果无标签则创建一个空标签 */
  function init(): void {
    if (tabs.value.length === 0) {
      createTab()
    }
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    createTab,
    closeTab,
    setActiveTab,
    duplicateTab,
    updateTabRequest,
    updateTabName,
    loadRequest,
    init
  }
})
