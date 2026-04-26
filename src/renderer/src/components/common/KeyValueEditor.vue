<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CopyDocument } from '@element-plus/icons-vue'
import type { KeyValue } from '@/types/request'

const { t } = useI18n()

/**
 * 组件 Props 定义
 * @property modelValue 键值对数组(双向绑定)
 * @property showDescription 是否显示描述列(默认 false)
 * @property addLabel 添加按钮的自定义文本(默认为空)
 */
const props = withDefaults(
  defineProps<{
    modelValue: KeyValue[]
    showDescription?: boolean
    addLabel?: string
  }>(),
  {
    showDescription: false,
    addLabel: ''
  }
)

/** 组件事件定义 - 更新 modelValue */
const emit = defineEmits<{ 'update:modelValue': [value: KeyValue[]] }>()

/** 是否处于批量编辑模式 */
const bulkMode = ref(false)
/** 批量编辑文本区域的内容 */
const bulkText = ref('')
/** 批量编辑格式: JSON 对象或 Query String */
const bulkFormat = ref<'json' | 'query'>('json')

/** 批量编辑占位符文本 */
const bulkPlaceholder = computed(() => {
  return '请参考下方示例填入信息'
})

// --- table mode operations - 表格模式操作 ---

/**
 * 更新指定行的字段值
 * 使用不可变更新方式(map 拷贝),确保 Vue 能检测到变化
 * @param index 行索引
 * @param field 要更新的字段名(key/value/enabled/description)
 * @param value 新值
 */
function updateRow(index: number, field: keyof KeyValue, value: string | boolean): void {
  const updated = props.modelValue.map((row, i) => (i === index ? { ...row, [field]: value } : row))
  emit('update:modelValue', updated)
}

/**
 * 添加新的空行到末尾
 */
function addRow(): void {
  emit('update:modelValue', [
    ...props.modelValue,
    { key: '', value: '', enabled: true, description: '' }
  ])
}

/**
 * 删除指定行
 * @param index 要删除的行索引
 */
function removeRow(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index)
  )
}

/**
 * 切换指定行的启用/禁用状态
 * @param index 行索引
 */
function toggleRow(index: number): void {
  updateRow(index, 'enabled', !props.modelValue[index].enabled)
}

// --- bulk mode ---

// --- bulk mode - 批量编辑模式 ---

/**
 * 将当前键值对数组转换为 Query String 格式
 * 只包含已启用且有 key 的项
 * @returns Query String(如 key1=value1&key2=value2)
 */
function toQueryString(): string {
  return props.modelValue
    .filter((r) => r.enabled && r.key)
    .map((r) => `${r.key}=${r.value}`)
    .join('&')
}

/**
 * 将当前键值对数组转换为 JSON 对象字符串
 * 只包含有 key 的项,格式化输出(2 空格缩进)
 * @returns JSON 字符串
 */
function toJsonString(): string {
  const obj: Record<string, string> = {}
  for (const r of props.modelValue) {
    if (r.key) obj[r.key] = r.value
  }
  return JSON.stringify(obj, null, 2)
}

/**
 * 根据当前选择的格式(bulkFormat)生成批量编辑文本
 * @returns JSON 或 Query String 格式的文本
 */
function toBulkText(): string {
  return bulkFormat.value === 'json' ? toJsonString() : toQueryString()
}

/**
 * 解析 JSON 格式的文本为键值对数组
 * 支持两种格式:
 * 1. 对象格式: {"key": "value"} -> [{key: "key", value: "value"}]
 * 2. 数组格式: [{"key": "k", "value": "v"}] -> 直接映射
 * @param raw JSON 字符串
 * @returns 键值对数组
 */
function parseJson(raw: string): KeyValue[] {
  const trimmed = raw.trim()
  const parsed = JSON.parse(trimmed)
  if (Array.isArray(parsed)) {
    // 数组格式:兼容多种字段名(key/name/[0], value/val/[1])
    return parsed.map((item) => ({
      key: item.key || item.name || item[0] || '',
      value: item.value || item.val || item[1] || '',
      enabled: item.enabled !== false
    }))
  }
  if (typeof parsed === 'object' && parsed !== null) {
    // 对象格式:直接遍历键值对
    return Object.entries(parsed).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      enabled: true
    }))
  }
  return []
}

/**
 * 解析 Query String 格式的文本为键值对数组
 * 支持 URL 编码的键和值,自动解码
 * @param raw Query String(如 key1=value1&key2=value2)
 * @returns 键值对数组
 */
function parseQueryString(raw: string): KeyValue[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  return trimmed.split('&').map((pair) => {
    const eqIdx = pair.indexOf('=')
    if (eqIdx < 0) return { key: decodeURIComponent(pair), value: '', enabled: true }
    return {
      key: decodeURIComponent(pair.substring(0, eqIdx)),
      value: decodeURIComponent(pair.substring(eqIdx + 1)),
      enabled: true
    }
  })
}

/**
 * 自动检测文本格式并解析
 * 以 { 或 [ 开头视为 JSON,否则视为 Query String
 * @param raw 待解析的文本
 * @returns 键值对数组
 */
function autoDetectAndParse(raw: string): KeyValue[] {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseJson(trimmed)
  }
  return parseQueryString(trimmed)
}

/**
 * 进入批量编辑模式,清空之前的输入内容
 */
function enterBulkMode(): void {
  bulkText.value = ''
  bulkMode.value = true
}

/**
 * 退出批量编辑模式,应用解析后的结果
 * 只有解析出有效数据时才更新 modelValue
 */
function exitBulkMode(): void {
  const parsed = autoDetectAndParse(bulkText.value)
  if (parsed.length > 0) {
    emit('update:modelValue', parsed)
  }
  bulkMode.value = false
}

/**
 * 切换批量编辑格式(JSON <-> Query String)
 * 先解析当前文本,再转换为目标格式,保持数据不变
 */
function toggleBulkFormat(): void {
  const currentParsed = autoDetectAndParse(bulkText.value)
  bulkFormat.value = bulkFormat.value === 'json' ? 'query' : 'json'
  if (bulkFormat.value === 'json') {
    // 转为 JSON 格式
    const obj: Record<string, string> = {}
    for (const r of currentParsed) {
      if (r.key) obj[r.key] = r.value
    }
    bulkText.value = JSON.stringify(obj, null, 2)
  } else {
    // 转为 Query String 格式
    bulkText.value = currentParsed
      .filter((r) => r.key)
      .map((r) => `${r.key}=${r.value}`)
      .join('&')
  }
}

/**
 * 取消批量编辑,不应用任何更改
 */
function cancelBulkMode(): void {
  bulkMode.value = false
}

/**
 * 复制当前的 Query String 到剪贴板
 * 失败时静默处理(降级策略)
 */
async function copyQueryString(): Promise<void> {
  try {
    await navigator.clipboard.writeText(toQueryString())
  } catch {
    // fallback — select the textarea content if clipboard API unavailable
  }
}
</script>

<template>
  <div class="kv-editor">
    <!-- Toolbar: toggle bulk edit -->
    <div class="kv-editor__toolbar">
      <button
        v-if="!bulkMode"
        class="kv-editor__bulk-btn"
        @click="enterBulkMode"
      >
        {{ t('keyValueEditor.bulkEdit') }}
      </button>
      <template v-else>
        <button
          class="kv-editor__bulk-btn kv-editor__bulk-btn--confirm"
          @click="exitBulkMode"
        >
          {{ t('common.confirm') }}
        </button>
        <button
          class="kv-editor__bulk-btn"
          @click="cancelBulkMode"
        >
          {{ t('common.cancel') }}
        </button>
        <div class="kv-editor__format-toggle">
          <button
            :class="['kv-editor__format-btn', { 'kv-editor__format-btn--active': bulkFormat === 'json' }]"
            @click="bulkFormat !== 'json' && toggleBulkFormat()"
          >
            JSON
          </button>
          <button
            :class="['kv-editor__format-btn', { 'kv-editor__format-btn--active': bulkFormat === 'query' }]"
            @click="bulkFormat !== 'query' && toggleBulkFormat()"
          >
            Query
          </button>
        </div>
      </template>
      <button
        v-if="!bulkMode && modelValue.some(r => r.key)"
        class="kv-editor__copy-btn"
        @click="copyQueryString"
        :title="t('keyValueEditor.copyQueryString')"
      >
        <el-icon :size="12">
          <CopyDocument />
        </el-icon>
      </button>
    </div>

    <!-- Bulk edit mode -->
    <div
      v-if="bulkMode"
      class="kv-editor__bulk"
    >
      <textarea
        v-model="bulkText"
        class="kv-editor__bulk-textarea"
        :placeholder="bulkPlaceholder"
        spellcheck="false"
      ></textarea>
      <div class="kv-editor__examples">
        <div class="kv-editor__example">
          <span class="kv-editor__example-label">{{ t('keyValueEditor.bulkEditJson') }}</span>
          <code class="kv-editor__example-code">{"token": "abc123", "version": "v1"}</code>
        </div>
        <div class="kv-editor__example">
          <span class="kv-editor__example-label">{{ t('keyValueEditor.bulkEditJsonArray') }}</span>
          <code class="kv-editor__example-code">[{"key": "token", "value": "abc123"}, {"key": "version", "value": "v1"}]</code>
        </div>
        <div class="kv-editor__example">
          <span class="kv-editor__example-label">{{ t('keyValueEditor.bulkEditQueryString') }}</span>
          <code class="kv-editor__example-code">token=abc123&version=v1&format=json</code>
        </div>
      </div>
    </div>

    <!-- Table mode -->
    <template v-else>
      <table class="kv-editor__table">
        <thead>
          <tr>
            <th class="kv-editor__col-toggle"></th>
            <th class="kv-editor__col-key">{{ t('request.key') }}</th>
            <th class="kv-editor__col-value">{{ t('request.value') }}</th>
            <th
              v-if="showDescription"
              class="kv-editor__col-desc"
            >{{ t('request.description') }}</th>
            <th class="kv-editor__col-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in modelValue"
            :key="index"
            :class="{ 'kv-editor__row--disabled': !row.enabled }"
          >
            <td>
              <el-checkbox
                :model-value="row.enabled"
                @change="toggleRow(index)"
              />
            </td>
            <td>
              <input
                class="kv-editor__input"
                :value="row.key"
                :placeholder="t('request.key')"
                @input="updateRow(index, 'key', ($event.target as any).value)"
              />
            </td>
            <td>
              <input
                class="kv-editor__input"
                :value="row.value"
                :placeholder="t('request.value')"
                @input="updateRow(index, 'value', ($event.target as any).value)"
              />
            </td>
            <td v-if="showDescription">
              <input
                class="kv-editor__input"
                :value="row.description || ''"
                :placeholder="t('request.description')"
                @input="updateRow(index, 'description', ($event.target as any).value)"
              />
            </td>
            <td>
              <button
                class="kv-editor__remove"
                @click="removeRow(index)"
              >
                <el-icon :size="14">
                  <Close />
                </el-icon>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        class="kv-editor__add"
        @click="addRow"
      >
        + {{ addLabel || t('request.addRow') }}
      </button>
    </template>
  </div>
</template>

<script lang="ts">
import { Close } from '@element-plus/icons-vue'
export default { components: { Close } }
</script>

<style scoped>
.kv-editor {
  display: flex;
  flex-direction: column;
}

.kv-editor__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) 0;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: var(--space-xs);
}

.kv-editor__bulk-btn {
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-sm);
}

.kv-editor__bulk-btn:hover {
  background: rgba(64, 158, 255, 0.08);
}

.kv-editor__bulk-btn--confirm {
  color: var(--color-success);
}

.kv-editor__format-toggle {
  display: flex;
  margin-left: auto;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  padding: 1px;
}

.kv-editor__format-btn {
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out);
}

.kv-editor__format-btn:hover {
  color: var(--color-text-secondary);
}

.kv-editor__format-btn--active {
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  box-shadow: var(--shadow-sm);
}

.kv-editor__copy-btn {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm);
  margin-left: auto;
}

.kv-editor__copy-btn:hover {
  color: var(--color-accent);
  background: rgba(64, 158, 255, 0.08);
}

.kv-editor__bulk {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.kv-editor__bulk-textarea {
  width: 100%;
  min-height: 100px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  font-family: var(--font-family-mono);
  font-size: var(--text-sm);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  resize: vertical;
  outline: none;
  transition: border-color var(--duration-fast);
}

.kv-editor__bulk-textarea:focus {
  border-color: var(--color-accent);
}

.kv-editor__examples {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxs);
  margin-top: var(--space-xxs);
}

.kv-editor__example {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: 1.6;
}

.kv-editor__example-label {
  flex-shrink: 0;
  min-width: 60px;
  color: var(--color-text-placeholder);
}

.kv-editor__example-code {
  font-family: var(--font-family-mono);
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 1px var(--space-xs);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kv-editor__table {
  width: 100%;
  border-collapse: collapse;
}

.kv-editor__table th {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.kv-editor__table td {
  padding: 2px var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.kv-editor__row--disabled {
  opacity: 0.4;
}
.kv-editor__col-toggle {
  width: 30px;
}
.kv-editor__col-actions {
  width: 30px;
}

.kv-editor__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-sm);
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  padding: var(--space-xs) 0;
}

.kv-editor__input::placeholder {
  color: var(--color-text-placeholder);
}

.kv-editor__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm);
}

.kv-editor__remove:hover {
  color: var(--color-danger);
  background: rgba(245, 108, 108, 0.08);
}

.kv-editor__add {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: var(--space-sm);
  transition: opacity var(--duration-fast);
}

.kv-editor__add:hover {
  opacity: 0.8;
}
</style>
