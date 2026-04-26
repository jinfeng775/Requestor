import { onMounted, onBeforeUnmount } from 'vue'
import { useTabStore } from '@/stores/tab'
import { useSidebarStore } from '@/stores/sidebar'
import { useRequest } from './useRequest'

/**
 * 全局快捷键管理组合式函数
 * 注册键盘快捷键,提供类似 Postman 的操作体验:
 * - Ctrl+Enter: 发送请求
 * - Ctrl+N: 新建标签页
 * - Ctrl+B: 切换侧边栏显隐
 * - Ctrl+L: 聚焦 URL 输入框并全选文本
 * - Ctrl+W: 关闭当前标签页
 * - Ctrl+S: 保存到集合(触发自定义事件)
 */
export function useShortcuts() {
  const tabStore = useTabStore()
  const sidebar = useSidebarStore()
  const { send } = useRequest()

  /**
   * 键盘事件处理器,根据按键组合执行相应操作
   * @param e 键盘事件对象
   */
  function handler(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey // 支持 Windows/Linux (Ctrl) 和 macOS (Cmd)

    if (ctrl && e.key === 'Enter') {
      // Ctrl+Enter: 发送当前请求
      e.preventDefault()
      send()
    } else if (ctrl && e.key === 'n') {
      // Ctrl+N: 创建新标签页
      e.preventDefault()
      tabStore.createTab()
    } else if (ctrl && e.key === 'b') {
      // Ctrl+B: 切换侧边栏显示/隐藏
      e.preventDefault()
      sidebar.toggle()
    } else if (ctrl && e.key === 'l') {
      // Ctrl+L: 聚焦 URL 输入框并选中文本(方便快速编辑)
      e.preventDefault()
      const urlInput = document.querySelector('.url-input__field') as HTMLInputElement
      urlInput?.focus()
      urlInput?.select()
    } else if (ctrl && e.key === 'w') {
      // Ctrl+W: 关闭当前活动的标签页
      e.preventDefault()
      if (tabStore.activeTabId) tabStore.closeTab(tabStore.activeTabId)
    } else if (ctrl && e.key === 's') {
      // Ctrl+S: 触发保存请求到集合的自定义事件(由其他组件监听处理)
      e.preventDefault()
      document.dispatchEvent(new CustomEvent('app:save-to-collection'))
    }
  }

  // 组件挂载时注册全局键盘监听器
  onMounted(() => document.addEventListener('keydown', handler))
  // 组件卸载前移除监听器,防止内存泄漏
  onBeforeUnmount(() => document.removeEventListener('keydown', handler))
}
