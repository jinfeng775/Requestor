import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { nanoid } from '@/utils/uuid'
import {
  REALTIME_PROTOCOL_LABELS,
  createDefaultRealtimeConfig,
  type RealtimeConnectionConfig,
  type RealtimeProtocol,
  type RealtimeTab
} from '@/types/realtime'

function cloneConfig(config: RealtimeConnectionConfig): RealtimeConnectionConfig {
  return JSON.parse(JSON.stringify(config)) as RealtimeConnectionConfig
}

function deriveTabName(config: RealtimeConnectionConfig): string {
  const label = REALTIME_PROTOCOL_LABELS[config.protocol]
  const target = 'url' in config ? config.url : config.brokerUrl
  if (!target) return label

  try {
    const parsed = new URL(target)
    const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : parsed.hostname
    return `${label} ${path}`
  } catch {
    return `${label} ${target}`
  }
}

export const useRealtimeTabStore = defineStore('realtime-tab', () => {
  const tabs = ref<RealtimeTab[]>([])
  const activeTabId = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeTabId.value) || null)

  function createTab(protocol: RealtimeProtocol = 'websocket', config?: RealtimeConnectionConfig): RealtimeTab {
    const nextConfig = cloneConfig(config ?? createDefaultRealtimeConfig(protocol))
    nextConfig.id = nextConfig.id || nanoid()

    const tab: RealtimeTab = {
      id: nanoid(),
      name: nextConfig.name || deriveTabName(nextConfig),
      config: nextConfig,
      hasUnsavedChanges: false
    }

    tabs.value = [...tabs.value, tab]
    activeTabId.value = tab.id
    return tab
  }

  function closeTab(id: string): void {
    const index = tabs.value.findIndex((tab) => tab.id === id)
    if (index === -1) return

    tabs.value = tabs.value.filter((tab) => tab.id !== id)
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value.length > 0 ? tabs.value[Math.min(index, tabs.value.length - 1)].id : null
    }
  }

  function setActiveTab(id: string): void {
    activeTabId.value = id
  }

  function updateTabConfig(id: string, config: RealtimeConnectionConfig): void {
    tabs.value = tabs.value.map((tab) => {
      if (tab.id !== id) return tab
      const nextConfig = cloneConfig(config)
      const autoName = deriveTabName(nextConfig)
      const currentAutoName = deriveTabName(tab.config)
      const isManualName = tab.name !== currentAutoName && tab.name !== REALTIME_PROTOCOL_LABELS[tab.config.protocol]
      return {
        ...tab,
        config: nextConfig,
        name: isManualName ? tab.name : autoName,
        hasUnsavedChanges: true
      }
    })
  }

  function updateTabName(id: string, name: string): void {
    tabs.value = tabs.value.map((tab) => (tab.id === id ? { ...tab, name } : tab))
  }

  function init(): void {
    if (tabs.value.length === 0) {
      createTab('websocket')
    }
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    createTab,
    closeTab,
    setActiveTab,
    updateTabConfig,
    updateTabName,
    init
  }
})
