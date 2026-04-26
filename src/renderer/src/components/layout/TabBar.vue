<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTabStore } from '@/stores/tab'
import { Plus, Close, DocumentCopy } from '@element-plus/icons-vue'
import type { HttpMethod } from '@/types/request'

const { t } = useI18n()
const tabStore = useTabStore()
/** 标签页列表容器的 DOM 引用(用于滚动定位) */
const tabList = ref<HTMLDivElement | null>(null)

/** 标签页右键菜单状态 */
const tabContextMenu = ref<{ show: boolean; x: number; y: number; tabId: string }>({
  show: false,
  x: 0,
  y: 0,
  tabId: ''
})

/**
 * 显示标签页右键菜单
 * @param e 鼠标事件
 * @param tabId 标签页 ID
 */
function onTabContextMenu(e: MouseEvent, tabId: string): void {
  e.preventDefault()
  tabContextMenu.value = { show: true, x: e.clientX, y: e.clientY, tabId }
}

/**
 * 关闭标签页右键菜单
 */
function closeTabContextMenu(): void {
  tabContextMenu.value.show = false
}

/**
 * 从右键菜单复制标签页
 * 调用 store 的 duplicateTab 方法创建副本
 */
function duplicateFromContext(): void {
  tabStore.duplicateTab(tabContextMenu.value.tabId)
  closeTabContextMenu()
}

/**
 * 点击文档任意位置时关闭右键菜单
 */
function onDocumentClick(): void {
  if (tabContextMenu.value.show) tabContextMenu.value.show = false
}

// 组件挂载时注册全局点击监听器,卸载时移除
onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

/**
 * 监听活动标签页变化,自动滚动到可视区域
 * 确保用户始终能看到当前活动的标签页
 */
watch(
  () => tabStore.activeTabId,
  () => {
    const el = tabList.value?.querySelector('.tab-bar__tab--active') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
)

/**
 * 根据 HTTP 方法生成对应的样式类名
 * 用于不同方法的彩色显示(GET=绿色, POST=蓝色等)
 * @param method HTTP 方法
 * @returns CSS 类名字符串
 */
function getMethodClass(method: HttpMethod): string {
  return `tab-bar__method tab-bar__method--${method.toLowerCase()}`
}
</script>

<template>
  <div class="tab-bar">
    <div
      ref="tabList"
      class="tab-bar__list"
    >
      <div
        v-for="tab in tabStore.tabs"
        :key="tab.id"
        :class="['tab-bar__tab', { 'tab-bar__tab--active': tab.id === tabStore.activeTabId }]"
        @click="tabStore.setActiveTab(tab.id)"
        @contextmenu="onTabContextMenu($event, tab.id)"
      >
        <span :class="getMethodClass(tab.request.method)">{{ tab.request.method }}</span>
        <span class="tab-bar__name">{{ tab.name }}</span>
        <span
          v-if="tab.hasUnsavedChanges"
          class="tab-bar__dot"
        ></span>
        <button
          v-if="tabStore.tabs.length > 1"
          class="tab-bar__close"
          @click.stop="tabStore.closeTab(tab.id)"
        >
          <el-icon :size="12">
            <Close />
          </el-icon>
        </button>
      </div>
    </div>
    <button
      class="tab-bar__add"
      :title="t('common.new')"
      @click="tabStore.createTab()"
    >
      <el-icon :size="14">
        <Plus />
      </el-icon>
    </button>

    <Teleport to="body">
      <Transition name="context-menu">
        <div
          v-if="tabContextMenu.show"
          class="tab-context-menu"
          :style="{ left: tabContextMenu.x + 'px', top: tabContextMenu.y + 'px' }"
          @click.stop
        >
          <div
            class="tab-context-menu__item"
            @click="duplicateFromContext"
          >
            <el-icon :size="12">
              <DocumentCopy />
            </el-icon>
            {{ t('common.duplicate') }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: flex-end;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  height: var(--tab-height);
  padding-left: var(--space-xs);
  flex-shrink: 0;
  user-select: none;
}

.tab-bar__list {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.tab-bar__list::-webkit-scrollbar {
  height: 3px;
}

.tab-bar__list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.tab-bar__list::-webkit-scrollbar-track {
  background: transparent;
}

.tab-bar__tab {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  height: calc(var(--tab-height) - 1px);
  padding: 0 var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  border-right: 1px solid var(--color-border-light);
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.tab-bar__tab:hover {
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.02);
}

.tab-bar__tab--active {
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
}

.tab-bar__tab--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: var(--space-sm);
  right: var(--space-sm);
  height: 2px;
  background: var(--color-accent);
  border-radius: 2px 2px 0 0;
  animation: tab-indicator 0.25s var(--ease-spring);
}

@keyframes tab-indicator {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

.tab-bar__method {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono);
  letter-spacing: 0.3px;
}

.tab-bar__method--get {
  color: var(--color-method-get);
}
.tab-bar__method--post {
  color: var(--color-method-post);
}
.tab-bar__method--put {
  color: var(--color-method-put);
}
.tab-bar__method--delete {
  color: var(--color-method-delete);
}
.tab-bar__method--patch {
  color: var(--color-method-patch);
}
.tab-bar__method--head {
  color: var(--color-method-head);
}
.tab-bar__method--options {
  color: var(--color-method-options);
}

.tab-bar__name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-bar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-warning);
  flex-shrink: 0;
  animation: dot-pulse 2s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.tab-bar__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-spring);
}

.tab-bar__tab:hover .tab-bar__close {
  opacity: 1;
}
.tab-bar__close:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--color-text-primary);
  transform: scale(1.1);
}

.tab-bar__close:active {
  transform: scale(0.85);
}

.tab-bar__add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: calc(var(--tab-height) - 2px);
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-spring);
}

.tab-bar__add:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-text-primary);
}

.tab-bar__add:active {
  transform: scale(0.85);
}

/* Context menu transition */
.context-menu-enter-active {
  transition: opacity 0.15s var(--ease-out), transform 0.15s var(--ease-spring);
}
.context-menu-leave-active {
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}
.context-menu-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
.context-menu-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.tab-context-menu {
  position: fixed;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dropdown);
  padding: var(--space-xs) 0;
  min-width: 140px;
  z-index: var(--z-dropdown);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.tab-context-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-xs);
  transition: background var(--duration-fast) var(--ease-out);
}

.tab-context-menu__item:hover {
  background: var(--color-bg-hover);
}
</style>
