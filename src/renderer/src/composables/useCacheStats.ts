import { ref, computed, onMounted } from 'vue'

/**
 * 缓存统计 composable
 * 用于获取历史记录和集合的缓存大小，并根据大小返回对应的颜色状态
 */

export interface CacheStats {
  historySize: number
  collectionsSize: number
  totalSize: number
}

export interface CacheColor {
  color: string
  status: 'healthy' | 'warning' | 'danger'
}

export function useCacheStats() {
  const historySize = ref(0)
  const collectionsSize = ref(0)

  const totalSize = computed(() => historySize.value + collectionsSize.value)

  /**
   * 根据缓存大小返回颜色和状态
   * 绿色(健康): < 5MB
   * 黄色(偏大): 5MB - 20MB
   * 红色(警告): > 20MB
   */
  function getCacheColor(bytes: number): CacheColor {
    const mb = bytes / (1024 * 1024)

    if (mb < 5) {
      return { color: 'var(--color-success)', status: 'healthy' }
    } else if (mb < 20) {
      return { color: '#E6A23C', status: 'warning' }
    } else {
      return { color: 'var(--color-danger)', status: 'danger' }
    }
  }

  const historyColor = computed(() => getCacheColor(historySize.value))
  const collectionsColor = computed(() => getCacheColor(collectionsSize.value))
  const totalColor = computed(() => getCacheColor(totalSize.value))

  /**
   * 格式化字节数为人类可读格式
   */
  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
  }

  /**
   * 加载缓存大小
   */
  async function loadCacheStats(): Promise<void> {
    if (!window.api) return

    try {
      const [history, collections] = await Promise.all([
        window.api.storageSize('requestor-history'),
        window.api.storageSize('requestor-collections')
      ])

      historySize.value = history || 0
      collectionsSize.value = collections || 0
    } catch (err) {
      console.error('[useCacheStats] Failed to load cache stats:', err)
    }
  }

  /**
   * 刷新缓存统计
   */
  async function refresh(): Promise<void> {
    await loadCacheStats()
  }

  onMounted(() => {
    loadCacheStats()
  })

  return {
    historySize,
    collectionsSize,
    totalSize,
    historyColor,
    collectionsColor,
    totalColor,
    formatSize,
    refresh
  }
}
