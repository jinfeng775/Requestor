<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

/** 水平拖拽调整手柄组件 - 用于上下面板高度调整 */

const emit = defineEmits<{
  resize: [delta: number] // 拖拽时的位移增量(像素)
}>()

/** 是否正在拖拽中 */
const isDragging = ref(false)
/** 鼠标按下时的 Y 坐标(用于计算垂直位移) */
const startY = ref(0)

/**
 * 鼠标按下事件处理 - 开始拖拽
 * 记录起始位置,设置光标样式,禁用文本选择,绑定全局事件监听器
 * @param e 鼠标事件对象
 */
function onMouseDown(e: MouseEvent): void {
  isDragging.value = true
  startY.value = e.clientY
  document.body.style.cursor = 'row-resize' // 显示上下调整光标
  document.body.style.userSelect = 'none' // 禁止选中文本
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

/**
 * 鼠标移动事件处理 - 计算位移并触发 resize 事件
 * 每次移动都更新起始位置,确保 delta 是相对上次位置的增量
 * @param e 鼠标事件对象
 */
function onMouseMove(e: MouseEvent): void {
  if (!isDragging.value) return
  const delta = e.clientY - startY.value
  startY.value = e.clientY // 更新起始位置
  emit('resize', delta)
}

/**
 * 鼠标释放事件处理 - 结束拖拽
 * 恢复光标和文本选择状态,移除全局事件监听器
 */
function onMouseUp(): void {
  isDragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

// 组件卸载前清理事件监听器(防止内存泄漏)
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    class="h-resize-handle"
    :class="{ 'h-resize-handle--active': isDragging }"
    @mousedown="onMouseDown"
  >
    <div class="h-resize-handle__bar"></div>
  </div>
</template>

<style scoped>
.h-resize-handle {
  height: 5px;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
}

.h-resize-handle::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -3px;
  bottom: -3px;
}

.h-resize-handle__bar {
  height: 1px;
  width: 100%;
  background: var(--color-border);
  transition: background var(--duration-fast) var(--ease-out),
    height var(--duration-fast) var(--ease-out);
}

.h-resize-handle:hover .h-resize-handle__bar,
.h-resize-handle--active .h-resize-handle__bar {
  height: 3px;
  background: var(--color-accent);
  border-radius: 2px;
}
</style>
