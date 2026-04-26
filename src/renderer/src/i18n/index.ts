import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

// 从 localStorage 读取保存的语言设置,默认中文
const savedLocale = localStorage.getItem('requestor-language') || 'zh-CN'

/**
 * 创建 i18n 实例
 * 配置说明:
 * - legacy: false - 使用 Composition API 模式
 * - locale: 当前语言(从 localStorage 读取)
 * - fallbackLocale: 回退语言(中文)
 * - messages: 语言包映射
 */
const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n
