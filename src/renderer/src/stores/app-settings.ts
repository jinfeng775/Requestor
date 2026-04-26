import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { loadData, saveData, migrateFromLocalStorage } from '@/utils/storage'

/** 主题模式类型 */
export type ThemeMode = 'light' | 'dark'
/** 语言类型 */
export type Language = 'zh-CN' | 'en-US'

interface AppSettingsData {
  theme?: ThemeMode
  language?: Language
  sidebarWidth?: number
  panelSplitPx?: number
}

const STORAGE_KEY = 'requestor-settings'

/**
 * 应用设置状态管理
 * 管理主题、语言、侧边栏宽度等全局配置项,并持久化到文件系统
 */
export const useAppSettingsStore = defineStore('app-settings', () => {
  const theme = ref<ThemeMode>('light')
  const language = ref<Language>('zh-CN')
  const sidebarWidth = ref(280)
  const panelSplitPx = ref(-1) // -1 = equal split (50/50)
  let loaded = false

  function setTheme(mode: ThemeMode): void {
    theme.value = mode
    document.documentElement.setAttribute('data-theme', mode)
  }

  function setLanguage(lang: Language): void {
    language.value = lang
  }

  function setSidebarWidth(width: number): void {
    sidebarWidth.value = Math.max(200, Math.min(500, width))
  }

  function setPanelSplitPx(px: number): void {
    panelSplitPx.value = Math.max(180, px)
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  function persist(): void {
    if (!loaded) return
    saveData(STORAGE_KEY, {
      theme: theme.value,
      language: language.value,
      sidebarWidth: sidebarWidth.value,
      panelSplitPx: panelSplitPx.value
    })
  }

  /**
   * 从文件系统加载设置
   * 同时迁移旧 localStorage 中的独立 key
   */
  async function loadFromDisk(): Promise<void> {
    // 迁移旧的 localStorage 独立 key → 合并到文件系统
    await migrateFromLocalStorage('requestor-theme', 'mypostman-theme')
    await migrateFromLocalStorage('requestor-language', 'mypostman-language')

    const data = await loadData<AppSettingsData>(STORAGE_KEY, {})
    if (data.theme === 'light' || data.theme === 'dark') {
      setTheme(data.theme)
    } else {
      // 无保存主题时跟随系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
    if (data.language) {
      language.value = data.language
    }
    if (data.sidebarWidth) {
      sidebarWidth.value = data.sidebarWidth
    }
    if (data.panelSplitPx !== undefined && data.panelSplitPx !== -1) {
      panelSplitPx.value = data.panelSplitPx
    }
    loaded = true
  }

  // 监听设置变化,自动持久化
  watch([theme, language, sidebarWidth, panelSplitPx], () => persist())

  return {
    theme,
    language,
    sidebarWidth,
    panelSplitPx,
    setTheme,
    setLanguage,
    setSidebarWidth,
    setPanelSplitPx,
    toggleTheme,
    loadFromDisk
  }
})
