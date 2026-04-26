<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponseStore } from '@/stores/response'
import { useToast } from '@/composables/useToast'
import { CopyDocument, Search, ArrowDown, ArrowUp, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { nextTick } from 'vue'
import JsonTreeView from './JsonTreeView.vue'
import MonacoEditor from './MonacoEditor.vue'

const { t } = useI18n()
const response = useResponseStore()
const toast = useToast()

const viewMode = ref<'pretty' | 'raw' | 'preview' | 'monaco'>('monaco') // 查看模式(pretty/raw/preview/monaco)
const searchQuery = ref('') // 搜索关键词
const showSearch = ref(false) // 是否显示搜索框
const expandAllKey = ref(0) // 用于触发全部展开的 key

/**
 * 尝试将响应体解析为 JSON 对象
 * 如果解析失败或不是 JSON 类型,返回 null
 * @returns 解析后的 JSON 对象或 null
 */
const parsedJson = computed(() => {
  if (!response.data || !response.isJson) return null
  try {
    return JSON.parse(response.data.body)
  } catch {
    return null
  }
})

/**
 * 判断响应内容是否为 HTML 类型
 * @returns 是否为 HTML 内容
 */
const isHtml = computed(() => {
  if (!response.data) return false
  const ct = response.data.contentType.toLowerCase()
  return ct.includes('html')
})

const currentMatchIndex = ref(0) // 当前高亮的匹配项索引

/**
 * 计算搜索关键词在响应体中的匹配次数
 * 使用正则表达式进行全局不区分大小写匹配
 * @returns 匹配次数
 */
const matchCount = computed(() => {
  if (!response.data || !searchQuery.value) return 0
  const q = searchQuery.value.toLowerCase()
  const matches = response.data.body.toLowerCase().match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
  return matches ? matches.length : 0
})

/**
 * 转义 HTML 特殊字符,防止 XSS 攻击
 * @param s 原始字符串
 * @returns 转义后的字符串
 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 生成带高亮标记的响应体 HTML
 * 支持单行和多行匹配,避免重复高亮已标记的内容
 * @returns 包含 <mark> 标签的 HTML 字符串
 */
const highlightedBodyHtml = computed(() => {
  if (!response.data) return ''
  const body = response.data.body
  if (!searchQuery.value) return escapeHtml(body)
  const escaped = escapeHtml(body)
  const escapedQ = escapeHtml(searchQuery.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const singleLineRegex = new RegExp(`(${escapedQ})`, 'gi')
  const highlighted = escaped.replace(singleLineRegex, '<mark class="json-highlight">$1</mark>')
  const multiLineRegex = new RegExp(escapedQ.replace(/\s+/g, '[\\s\\S]*'), 'gi')
  return highlighted.replace(multiLineRegex, (match) => {
    if (match.includes('json-highlight')) return match
    return '<mark class="json-highlight">' + match + '</mark>'
  })
})

// 监听搜索相关变化,重置当前匹配索引
watch(searchQuery, () => { currentMatchIndex.value = 0 })
watch(matchCount, () => { currentMatchIndex.value = 0 })
watch(viewMode, () => { currentMatchIndex.value = 0 })

/** 跳转到下一个匹配项(循环) */
function goToNextMatch(): void {
  if (matchCount.value === 0) return
  currentMatchIndex.value = (currentMatchIndex.value + 1) % matchCount.value
  highlightCurrentMatch()
}

/** 跳转到上一个匹配项(循环) */
function goToPrevMatch(): void {
  if (matchCount.value === 0) return
  currentMatchIndex.value = (currentMatchIndex.value - 1 + matchCount.value) % matchCount.value
  highlightCurrentMatch()
}

/**
 * 高亮当前匹配的搜索项并滚动到可视区域
 * 使用 nextTick 确保 DOM 已更新,然后找到对应的 <mark> 元素
 */
function highlightCurrentMatch(): void {
  nextTick(() => {
    const marks = document.querySelectorAll<HTMLElement>('.json-highlight')
    marks.forEach((m) => m.classList.remove('json-highlight--active'))
    if (marks.length === 0) return
    const idx = Math.min(currentMatchIndex.value, marks.length - 1)
    const target = marks[idx]
    target.classList.add('json-highlight--active')
    target.scrollIntoView({ behavior: 'smooth', block: 'center' }) // 平滑滚动到中间
  })
}

/**
 * 复制响应体到剪贴板
 * 使用 Clipboard API,失败时显示错误提示
 */
async function copyResponse(): Promise<void> {
  if (!response.data) return
  try {
    await navigator.clipboard.writeText(response.data.body)
    toast.success(t('response.copied'))
  } catch {
    toast.error('Failed to copy')
  }
}

/**
 * 搜索框键盘事件处理
 * Escape: 关闭搜索框并清空关键词
 * Enter: 跳转到下一个/上一个匹配项(Shift+Enter 向上)
 * @param e 键盘事件对象
 */
function onSearchKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    showSearch.value = false
    searchQuery.value = ''
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) {
      goToPrevMatch()
    } else {
      goToNextMatch()
    }
  }
}

/**
 * 切换搜索框显示状态
 * 关闭时自动清空搜索关键词
 */
function toggleSearch(): void {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchQuery.value = ''
}

function onKeyDown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    toggleSearch()
  }
}

// Force re-render of JsonTreeView with expand-all signal
// Uses a key counter so the watcher fires every time
const expandAllSignal = ref<boolean | undefined>(undefined)

function expandAll(): void {
  expandAllSignal.value = true
  expandAllKey.value++
}

function collapseAll(): void {
  expandAllSignal.value = false
  expandAllKey.value++
}
</script>

<template>
  <div v-if="response.data" class="response-body" @keydown="onKeyDown">
    <div class="response-body__toolbar">
      <div class="response-body__toolbar-left">
        <button
          :class="['response-body__btn', { 'response-body__btn--active': viewMode === 'monaco' }]"
          @click="viewMode = 'monaco'"
        >
          Monaco
        </button>
        <button
          :class="['response-body__btn', { 'response-body__btn--active': viewMode === 'pretty' }]"
          @click="viewMode = 'pretty'"
        >
          {{ t('response.pretty') }}
        </button>
        <button
          :class="['response-body__btn', { 'response-body__btn--active': viewMode === 'raw' }]"
          @click="viewMode = 'raw'"
        >
          {{ t('response.raw') }}
        </button>
        <button
          v-if="isHtml"
          :class="['response-body__btn', { 'response-body__btn--active': viewMode === 'preview' }]"
          @click="viewMode = 'preview'"
        >
          {{ t('response.preview') }}
        </button>
      </div>
      <div class="response-body__toolbar-right">
        <template v-if="viewMode === 'pretty' && parsedJson !== null">
          <button class="response-body__icon-btn" :title="t('responseView.expandAll')" @click="expandAll">
            <el-icon :size="14"><ArrowDown /></el-icon>
          </button>
          <button class="response-body__icon-btn" :title="t('responseView.collapseAll')" @click="collapseAll">
            <el-icon :size="14"><ArrowUp /></el-icon>
          </button>
        </template>
        <button class="response-body__icon-btn" :title="t('response.search')" @click="toggleSearch">
          <el-icon :size="14"><Search /></el-icon>
        </button>
        <button class="response-body__icon-btn" :title="t('response.copy')" @click="copyResponse">
          <el-icon :size="14"><CopyDocument /></el-icon>
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <div v-if="showSearch" class="response-body__search">
      <el-icon :size="14" class="response-body__search-icon"><Search /></el-icon>
      <input
        v-model="searchQuery"
        class="response-body__search-input"
        :placeholder="t('response.search')"
        autofocus
        @keydown="onSearchKeydown"
      />
      <template v-if="searchQuery && matchCount > 0">
        <span class="response-body__search-count">{{ currentMatchIndex + 1 }}/{{ matchCount }}</span>
        <button class="response-body__search-nav" :title="t('responseView.previous')" @click="goToPrevMatch">
          <el-icon :size="14"><ArrowLeft /></el-icon>
        </button>
        <button class="response-body__search-nav" :title="t('responseView.next')" @click="goToNextMatch">
          <el-icon :size="14"><ArrowRight /></el-icon>
        </button>
      </template>
      <span v-else-if="searchQuery" class="response-body__search-count">0/0</span>
    </div>

    <div class="response-body__content">
      <template v-if="viewMode === 'monaco' && response.data">
        <MonacoEditor
          :model-value="response.data.body"
          :language="response.isJson ? 'json' : 'text'"
          :readonly="true"
          :search-query="searchQuery || undefined"
        />
      </template>
      <template v-else-if="viewMode === 'preview' && isHtml && response.data">
        <iframe
          class="response-body__preview"
          :srcdoc="response.data.body"
          sandbox="allow-same-origin"
        ></iframe>
      </template>
      <template v-else-if="viewMode === 'pretty' && parsedJson !== null">
        <div class="response-body__json">
          <JsonTreeView
            :key="expandAllKey"
            :data="parsedJson"
            :depth="0"
            :search-query="searchQuery || undefined"
            :expand-all="expandAllSignal"
          />
        </div>
      </template>
      <template v-else>
        <div class="response-body__raw" v-html="highlightedBodyHtml"></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.response-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.response-body__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) 0;
  flex-shrink: 0;
}

.response-body__toolbar-left {
  display: flex;
  gap: var(--space-xs);
}

.response-body__toolbar-right {
  display: flex;
  gap: var(--space-xxs);
}

.response-body__btn {
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  padding: 3px var(--space-sm);
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
}

.response-body__btn:hover {
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.03);
}

.response-body__btn--active {
  color: var(--color-accent);
  background: rgba(0, 122, 255, 0.08);
}

.response-body__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-spring);
}

.response-body__icon-btn:hover {
  background: rgba(0, 0, 0, 0.03);
  color: var(--color-text-primary);
}

.response-body__icon-btn:active {
  transform: scale(0.88);
}

.response-body__search {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.response-body__search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.response-body__search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  outline: none;
  padding: 2px 0;
}

.response-body__search-input::placeholder {
  color: var(--color-text-placeholder);
}

.response-body__search-count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 0 var(--space-xs);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  min-width: 32px;
  text-align: center;
}

.response-body__search-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: color var(--duration-fast), background var(--duration-fast);
}

.response-body__search-nav:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.response-body__content {
  flex: 1;
  overflow: auto;
}

.response-body__json {
  padding: var(--space-sm);
}

.response-body__preview {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.response-body__raw {
  margin: 0;
  padding: var(--space-md);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

<style>
.json-highlight--active {
  background: rgba(255, 150, 0, 0.6);
  outline: 2px solid rgba(255, 150, 0, 0.8);
  border-radius: 2px;
}

html[data-theme='dark'] .json-highlight--active {
  background: rgba(255, 180, 0, 0.35);
  outline-color: rgba(255, 180, 0, 0.6);
}
</style>
