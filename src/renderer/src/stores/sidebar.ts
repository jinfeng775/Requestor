import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 侧边栏状态管理
 * 控制侧边栏的折叠状态和宽度
 */
export const useSidebarStore = defineStore('sidebar', () => {
  /** 是否折叠侧边栏 */
  const collapsed = ref(false)
  /** 侧边栏宽度(px) */
  const width = ref(280)

  /**
   * 切换侧边栏折叠/展开状态
   */
  function toggle(): void {
    collapsed.value = !collapsed.value
  }

  /**
   * 设置侧边栏宽度(限制在 200-500px 范围内)
   * @param w 宽度值(px)
   */
  function setWidth(w: number): void {
    width.value = Math.max(200, Math.min(500, w))
  }

  return { collapsed, width, toggle, setWidth }
})
