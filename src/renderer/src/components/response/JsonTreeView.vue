<script setup lang="ts">
import { ref, computed, watch } from 'vue'

/**
 * JSON 树形视图组件 Props
 * @property data 要展示的 JSON 数据(任意类型)
 * @property depth 当前嵌套深度(用于缩进,默认 0)
 * @property searchQuery 搜索关键词(用于高亮匹配内容)
 * @property expandAll 是否全部展开(外部控制)
 * @property parentIsArray 父节点是否为数组(影响初始展开状态)
 */
const props = defineProps<{
  data: unknown
  depth?: number
  searchQuery?: string
  expandAll?: boolean
  parentIsArray?: boolean
}>()

/** 当前嵌套深度 */
const depth = props.depth ?? 0
/** 是否展开(默认展开前两层,或父节点是数组时展开) */
const isExpanded = ref(depth < 2 || props.parentIsArray === true)

/** 数据是否为数组 */
const isArray = computed(() => Array.isArray(props.data))
/** 数据是否为对象(非 null、非数组) */
const isObject = computed(
  () => typeof props.data === 'object' && props.data !== null && !isArray.value
)
/** 数据是否可展开(数组或对象) */
const isExpandable = computed(() => isArray.value || isObject.value)

/**
 * 提取对象/数组的条目列表
 * 数组:索引作为 key,元素作为 value
 * 对象:键作为 key,值作为 value
 * @returns 条目数组 [{key, value}]
 */
const entries = computed(() => {
  if (isArray.value) return (props.data as unknown[]).map((v, i) => ({ key: String(i), value: v }))
  if (isObject.value)
    return Object.entries(props.data as Record<string, unknown>).map(([k, v]) => ({
      key: k,
      value: v
    }))
  return []
})

/**
 * 监听 expandAll prop 变化,同步更新展开状态
 * 允许外部控制全部展开/折叠
 */
watch(
  () => props.expandAll,
  (v) => {
    if (v !== undefined) isExpanded.value = v
  }
)

/**
 * 监听搜索关键词变化,如果当前节点包含匹配内容则自动展开
 * 使用 immediate: true 确保初始化时也执行检查
 */
watch(
  () => props.searchQuery,
  (q) => {
    if (!q || !isExpandable.value) return
    const lower = q.toLowerCase()
    const json = JSON.stringify(props.data).toLowerCase()
    if (json.includes(lower)) isExpanded.value = true // 匹配则展开
  },
  { immediate: true }
)

/**
 * 切换展开/折叠状态
 */
function toggle(): void {
  isExpanded.value = !isExpanded.value
}

/**
 * 根据值的类型返回对应的 CSS 类名
 * 用于语法高亮(null=灰色, string=绿色, number=棕色, boolean=蓝色)
 * @param val 要判断的值
 * @returns CSS 类名
 */
function valueClass(val: unknown): string {
  if (val === null || val === undefined) return 'json-null'
  if (typeof val === 'string') return 'json-string'
  if (typeof val === 'number') return 'json-number'
  if (typeof val === 'boolean') return 'json-boolean'
  return 'json-object'
}

/**
 * 格式化值为字符串表示
 * null -> "null", undefined -> "undefined", string -> '"value"', 其他 -> String(val)
 * @param val 要格式化的值
 * @returns 格式化后的字符串
 */
function formatValue(val: unknown): string {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (typeof val === 'string') return `"${val}"`
  return String(val)
}

/**
 * 高亮显示文本中的搜索关键词
 * 先转义 HTML 特殊字符防止 XSS,再用正则替换关键词为 <mark> 标签
 * @param text 要高亮的文本
 * @returns 包含 <mark> 标签的 HTML 字符串
 */
function highlight(text: string): string {
  if (!props.searchQuery) return escapeHtml(text)
  const q = props.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义正则特殊字符
  return escapeHtml(text).replace(
    new RegExp(`(${q})`, 'gi'),
    '<mark class="json-highlight">$1</mark>'
  )
}

/**
 * 转义 HTML 特殊字符,防止 XSS 攻击
 * 将 & < > " 转换为 HTML 实体
 * @param s 原始字符串
 * @returns 转义后的字符串
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 开括号([ 或 {) */
const BRACKET_OPEN = computed(() => (isArray.value ? '[' : '{'))
/** 闭括号(] 或 }) */
const BRACKET_CLOSE = computed(() => (isArray.value ? ']' : '}'))
/** 条目数量 */
const entryCount = computed(() => entries.value.length)
</script>

<template>
  <div
    class="json-tree"
    :class="{ 'json-tree--root': !depth }"
  >
    <!-- Expandable node: object or array -->
    <template v-if="isExpandable">
      <div
        class="json-tree__line"
        @click="toggle"
      >
        <span class="json-tree__toggle">{{ isExpanded ? '▾' : '▸' }}</span>
        <span class="json-tree__bracket">{{ BRACKET_OPEN }}</span>
        <span
          v-if="!isExpanded"
          class="json-tree__collapsed"
        >
          {{ entryCount }} {{ isArray ? 'items' : 'keys' }}
          <span class="json-tree__bracket">{{ BRACKET_CLOSE }}</span>
        </span>
      </div>

      <template v-if="isExpanded">
        <div
          v-for="(entry, idx) in entries"
          :key="entry.key"
          class="json-tree__entry"
        >
          <template v-if="typeof entry.value === 'object' && entry.value !== null">
            <div class="json-tree__line">
              <span
                class="json-tree__key"
                v-html="'&quot;' + highlight(entry.key) + '&quot;'"
              ></span>
              <span class="json-tree__colon">: </span>
            </div>
            <JsonTreeView
              :data="entry.value"
              :depth="(depth ?? 0) + 1"
              :search-query="searchQuery"
              :expand-all="expandAll"
              :parent-is-array="isArray"
            />
            <span
              v-if="idx < entries.length - 1"
              class="json-tree__comma"
            >,</span>
          </template>
          <template v-else>
            <div class="json-tree__line">
              <span
                class="json-tree__key"
                v-html="'&quot;' + highlight(entry.key) + '&quot;'"
              ></span>
              <span class="json-tree__colon">: </span>
              <span
                :class="valueClass(entry.value)"
                v-html="highlight(formatValue(entry.value))"
              ></span>
              <span
                v-if="idx < entries.length - 1"
                class="json-tree__comma"
              >,</span>
            </div>
          </template>
        </div>
        <div class="json-tree__line json-tree__close">
          <span class="json-tree__bracket">{{ BRACKET_CLOSE }}</span>
        </div>
      </template>
    </template>

    <!-- Primitive value (standalone) -->
    <template v-else>
      <span
        :class="valueClass(data)"
        v-html="highlight(formatValue(data))"
      ></span>
    </template>
  </div>
</template>

<style>
/* Non-scoped so highlight marks work inside v-html */
.json-highlight {
  background: rgba(255, 213, 0, 0.4);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

html[data-theme='dark'] .json-highlight {
  background: rgba(255, 213, 0, 0.25);
}
</style>

<style scoped>
.json-tree {
  font-family: var(--font-family-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-primary);
}

.json-tree--root {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.json-tree__line {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding-left: calc((var(--depth, 0)) * 20px);
}

.json-tree:not(.json-tree--root) {
  padding-left: 20px;
}

.json-tree__toggle {
  cursor: pointer;
  user-select: none;
  color: var(--color-text-tertiary);
  font-size: 11px;
  width: 14px;
  flex-shrink: 0;
  text-align: center;
  transition: color var(--duration-fast);
}

.json-tree__toggle:hover {
  color: var(--color-accent);
}

.json-tree__key {
  color: #a626a4;
  font-weight: 500;
}

html[data-theme='dark'] .json-tree__key {
  color: #c678dd;
}

.json-tree__colon {
  color: var(--color-text-tertiary);
}

.json-tree__bracket {
  color: var(--color-text-secondary);
  font-weight: 600;
}

.json-tree__collapsed {
  color: var(--color-text-tertiary);
  font-size: 12px;
  font-style: italic;
  margin-left: 2px;
}

.json-tree__comma {
  color: var(--color-text-tertiary);
}

.json-tree__close {
  display: flex;
}

.json-string {
  color: #50a14f;
}
.json-number {
  color: #986801;
}
.json-boolean {
  color: #0184bc;
  font-weight: 600;
}
.json-null {
  color: var(--color-text-tertiary);
  font-style: italic;
}

html[data-theme='dark'] .json-string {
  color: #98c379;
}
html[data-theme='dark'] .json-number {
  color: #d19a66;
}
html[data-theme='dark'] .json-boolean {
  color: #56b6c2;
}
</style>
