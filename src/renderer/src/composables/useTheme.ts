import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppSettingsStore } from '@/stores/app-settings'

/**
 * 主题管理组合式函数
 * 支持明亮/暗黑模式切换,以及跟随系统主题(auto 模式)
 * @returns 主题相关的状态和方法
 */
export function useTheme() {
  const settings = useAppSettingsStore()

  /** 当前是否为暗黑模式 */
  const isDark = computed(() => settings.theme === 'dark')

  /**
   * 切换主题(明亮 <-> 暗黑)
   */
  function toggle(): void {
    settings.toggleTheme()
  }

  /**
   * 设置主题模式
   * auto 模式会监听系统主题变化并自动切换,同时将选择保存到 localStorage
   * @param mode 主题模式: 'light' | 'dark' | 'auto'
   */
  function setTheme(mode: 'light' | 'dark' | 'auto'): void {
    if (mode === 'auto') {
      // 根据系统偏好设置初始主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      settings.setTheme(prefersDark ? 'dark' : 'light')
      localStorage.setItem('requestor-theme', 'auto')
    } else {
      settings.setTheme(mode)
    }
  }

  /**
   * 启动系统主题变化监听器
   * 当用户选择了 auto 模式时,监听系统主题变化并自动更新应用主题
   */
  function startSystemListener(): void {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', (e) => {
      const saved = localStorage.getItem('requestor-theme')
      if (saved === 'auto') {
        settings.setTheme(e.matches ? 'dark' : 'light')
      }
    })
  }

  return { isDark, toggle, setTheme, startSystemListener, theme: computed(() => settings.theme) }
}

/**
 * 语言管理组合式函数
 * 提供中英文切换功能,同步更新 Pinia store 和 vue-i18n
 * @returns 语言相关的状态和方法
 */
export function useLanguage() {
  const settings = useAppSettingsStore()
  const { locale } = useI18n()

  /**
   * 设置应用语言
   * 同时更新 Pinia store 和 vue-i18n 的 locale
   * @param lang 语言代码: 'zh-CN' | 'en-US'
   */
  function setLanguage(lang: 'zh-CN' | 'en-US'): void {
    settings.setLanguage(lang)
    locale.value = lang
  }

  /**
   * 切换语言(中文 <-> 英文)
   */
  function toggleLanguage(): void {
    const next = settings.language === 'zh-CN' ? 'en-US' : 'zh-CN'
    setLanguage(next)
  }

  return {
    language: computed(() => settings.language),
    setLanguage,
    toggleLanguage
  }
}
