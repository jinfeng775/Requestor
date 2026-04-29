<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import { useResponseStore } from '@/stores/response'
import { useHistoryStore } from '@/stores/history'
import { useCollectionStore } from '@/stores/collection'
import { useTabStore } from '@/stores/tab'
import { useRequest } from '@/composables/useRequest'
import { useToast } from '@/composables/useToast'
import { fromCurl, toCurl } from '@/utils/curl'
import { DocumentCopy, Document, FolderAdd } from '@element-plus/icons-vue'
import MethodSelector from './MethodSelector.vue'
import SaveToCollectionDialog from '../common/SaveToCollectionDialog.vue'
import type { SaveItem } from '../common/SaveToCollectionDialog.vue'

const { t } = useI18n()
const editor = useRequestEditorStore()
const response = useResponseStore()
const history = useHistoryStore()
const collections = useCollectionStore()
const tabStore = useTabStore()
const { send } = useRequest()
const toast = useToast()

/** 是否显示自动补全下拉列表 */
const showAutocomplete = ref(false)
/** 是否显示 cURL 导入对话框 */
const showCurlImport = ref(false)
/** cURL 命令输入内容 */
const curlInput = ref('')
/** 是否显示保存到集合对话框 */
const showSaveDialog = ref(false)
/** 待保存的请求项列表 */
const saveItems = ref<SaveItem[]>([])

/**
 * 根据用户输入的 URL 生成历史记录自动补全建议
 * 匹配策略:输入文本出现在历史记录 URL 中即视为匹配(不区分大小写)
 * 去重策略:相同的 URL 只显示一次,避免重复建议
 * 限制最多返回 8 条结果,避免下拉列表过长影响性能
 * @returns 自动补全建议列表(包含 URL、HTTP 方法和时间戳)
 */
const suggestions = computed(() => {
  const url = editor.activeRequest.url.trim().toLowerCase()
  if (!url || url.length < 2) return [] // 输入少于 2 个字符时不显示建议
  const seen = new Set<string>() // 用于去重
  const results: Array<{ url: string; method: string; time: number }> = []
  for (const entry of history.entries) {
    const entryUrl = entry.request.url.toLowerCase()
    if (entryUrl.includes(url) && !seen.has(entryUrl)) {
      seen.add(entryUrl)
      results.push({ url: entry.request.url, method: entry.request.method, time: entry.timestamp })
      if (results.length >= 8) break // 最多返回 8 条建议
    }
  }
  return results
})

/**
 * URL 输入框的值变化处理函数
 * 更新请求编辑器中的 URL,并根据是否有建议决定是否显示自动补全下拉列表
 * @param e 输入事件对象
 */
function onUrlInput(e: Event): void {
  const value = (e.target as HTMLInputElement).value
  editor.setUrl(value)
  showAutocomplete.value = suggestions.value.length > 0
}

/**
 * URL 输入框获得焦点时,如果有建议则显示自动补全下拉列表
 */
function onUrlFocus(): void {
  if (suggestions.value.length > 0) showAutocomplete.value = true
}

/**
 * URL 输入框失去焦点时,延迟隐藏自动补全下拉列表
 * 使用 setTimeout 是为了让用户有时间点击建议项(点击会先触发 blur)
 */
function onUrlBlur(): void {
  setTimeout(() => {
    showAutocomplete.value = false
  }, 150)
}

/**
 * 选择自动补全建议项,将建议的 URL 填入输入框并关闭下拉列表
 * @param url 选中的 URL
 */
function selectSuggestion(url: string): void {
  editor.setUrl(url)
  showAutocomplete.value = false
}

/**
 * 发送 HTTP 请求
 * 调用 useRequest composable 的 send 方法执行请求
 */
async function onSend(): Promise<void> {
  await send()
}

/**
 * URL 输入框的键盘事件处理
 * 支持 Ctrl/Cmd + Enter 快捷键发送请求
 * @param e 键盘事件对象
 */
function onKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    onSend()
  }
}

/**
 * 保存当前请求到集合
 * 从标签页获取请求名称,打开保存对话框让用户选择目标集合
 */
function onSaveToCollection(): void {
  if (!editor.hasUrl) return // 没有 URL 时不允许保存
  const tabName = tabStore.activeTab?.name || 'Untitled'
  const item: SaveItem = {
    name: tabName,
    request: JSON.parse(JSON.stringify(editor.activeRequest))
  }
  // 如果当前有响应数据,一并携带
  if (response.data) {
    item.response = JSON.parse(JSON.stringify({
      status: response.data.status,
      statusText: response.data.statusText,
      body: response.data.body,
      headers: response.data.headers,
      contentType: response.data.contentType,
      bodySize: response.data.bodySize,
      headerSize: response.data.headerSize,
      totalTime: response.data.totalTime,
      cookies: response.data.cookies,
      networkDetails: response.data.networkDetails
    }))
  }
  saveItems.value = [item]
  showSaveDialog.value = true
}

// 监听全局保存事件(Ctrl+S 快捷键触发)
onMounted(() => {
  document.addEventListener('app:save-to-collection', onSaveToCollection)
})
onUnmounted(() => {
  document.removeEventListener('app:save-to-collection', onSaveToCollection)
})

/**
 * 将当前请求导出为 cURL 命令并复制到剪贴板
 * 使用 navigator.clipboard API,成功后显示提示消息
 */
function copyCurl(): void {
  const curl = toCurl(editor.activeRequest)
  navigator.clipboard.writeText(curl).then(() => {
    toast.success(t('toast.curlCopied'))
  })
}

/**
 * 打开 cURL 导入对话框,清空之前的输入内容
 */
function openCurlImport(): void {
  curlInput.value = ''
  showCurlImport.value = true
}

/**
 * 解析用户输入的 cURL 命令并加载到请求编辑器
 * 解析成功则关闭对话框并显示成功提示,失败则显示错误提示
 */
function importCurl(): void {
  const config = fromCurl(curlInput.value)
  if (config) {
    editor.loadRequest(config)
    showCurlImport.value = false
    toast.success(t('toast.curlImported'))
  } else {
    toast.error(t('toast.curlImportError'))
  }
}

/**
 * 根据 HTTP 方法生成对应的样式类名
 * 用于自动补全列表中不同方法的彩色显示(GET=绿色, POST=蓝色等)
 * @param method HTTP 方法名称
 * @returns CSS 类名字符串
 */
function getMethodClass(method: string): string {
  return `autocomplete__method autocomplete__method--${method.toLowerCase()}`
}

/**
 * 格式化 URL 用于显示在自动补全列表中
 * 提取 pathname 和 search 部分,去掉协议和域名,使显示更简洁
 * @param url 完整 URL
 * @returns 格式化后的 URL(如 /api/users?id=1)
 */
function formatUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    // 如果 URL 格式不正确,直接返回原始值
    return url
  }
}
</script>

<template>
  <div class="url-input">
    <MethodSelector
      :model-value="editor.activeRequest.method"
      @update:model-value="editor.setMethod"
    />
    <div class="url-input__field-wrapper">
      <input
        class="url-input__field"
        :value="editor.activeRequest.url"
        :placeholder="t('request.url')"
        @input="onUrlInput"
        @focus="onUrlFocus"
        @blur="onUrlBlur"
        @keydown="onKeydown"
      />
      <!-- Autocomplete dropdown -->
      <div
        v-if="showAutocomplete && suggestions.length > 0"
        class="url-input__autocomplete"
      >
        <div
          v-for="(s, i) in suggestions"
          :key="i"
          class="autocomplete__item"
          @mousedown.prevent="selectSuggestion(s.url)"
        >
          <span :class="getMethodClass(s.method)">{{ s.method }}</span>
          <span class="autocomplete__url">{{ formatUrl(s.url) }}</span>
        </div>
      </div>
    </div>
    <div class="url-input__actions">
      <button
        class="url-input__curl-btn"
        :title="t('request.curlExport')"
        @click="copyCurl"
      >
        <el-icon :size="14">
          <DocumentCopy />
        </el-icon>
      </button>
      <button
        class="url-input__curl-btn"
        :title="t('request.curlImport')"
        @click="openCurlImport"
      >
        <el-icon :size="14">
          <Document />
        </el-icon>
      </button>
      <el-button
        class="url-input__send"
        type="primary"
        :loading="response.loading"
        :disabled="!editor.hasUrl"
        @click="onSend"
      >
        {{ t('common.send') }}
      </el-button>
      <button
        class="url-input__save-btn"
        :title="t('common.saveTo')"
        :disabled="!editor.hasUrl"
        @click="onSaveToCollection"
      >
        <el-icon :size="14">
          <FolderAdd />
        </el-icon>
      </button>
    </div>

    <!-- cURL import dialog -->
    <el-dialog
      v-model="showCurlImport"
      :title="t('request.importCurl')"
      width="560px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-input
        v-model="curlInput"
        type="textarea"
        :rows="5"
        placeholder="curl -X GET 'https://api.example.com/data?foo=bar' -H 'Authorization: Bearer xxx'"
      />
      <template #footer>
        <el-button @click="showCurlImport = false">{{ t('common.cancel') }}</el-button>
        <el-button
          type="primary"
          :disabled="!curlInput.trim()"
          @click="importCurl"
        >
          {{ t('common.import') }}
        </el-button>
      </template>
    </el-dialog>

    <SaveToCollectionDialog
      v-model:visible="showSaveDialog"
      :items="saveItems"
    />
  </div>
</template>

<style scoped>
.url-input {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-primary);
  flex-shrink: 0;
}

.url-input__field-wrapper {
  flex: 1;
  position: relative;
}

.url-input__field {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 7px var(--space-md);
  font-size: var(--text-md);
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  background: var(--color-bg-input);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
}

.url-input__field:hover {
  border-color: var(--color-text-tertiary);
}

.url-input__field:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
}

.url-input__field::placeholder {
  color: var(--color-text-placeholder);
}

.url-input__autocomplete {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dropdown);
  z-index: var(--z-dropdown);
  max-height: 240px;
  overflow-y: auto;
  padding: var(--space-xs) 0;
  animation: autocomplete-in 0.2s var(--ease-spring);
}

@keyframes autocomplete-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.autocomplete__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-sm);
  cursor: pointer;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-xs);
  transition: background var(--duration-fast) var(--ease-out);
}

.autocomplete__item:hover {
  background: var(--color-bg-hover);
}

.autocomplete__method {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono);
  min-width: 44px;
  flex-shrink: 0;
}

.autocomplete__method--get {
  color: var(--color-method-get);
}
.autocomplete__method--post {
  color: var(--color-method-post);
}
.autocomplete__method--put {
  color: var(--color-method-put);
}
.autocomplete__method--delete {
  color: var(--color-method-delete);
}
.autocomplete__method--patch {
  color: var(--color-method-patch);
}
.autocomplete__method--head {
  color: var(--color-method-head);
}
.autocomplete__method--options {
  color: var(--color-method-options);
}

.autocomplete__url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
}

.url-input__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xxs);
}

.url-input__curl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-spring);
}

.url-input__curl-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.url-input__curl-btn:active {
  transform: scale(0.9);
}

.url-input__send {
  min-width: 72px;
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-md) !important;
  transition: all var(--duration-fast) var(--ease-out) !important;
}

.url-input__send:active {
  transform: scale(0.96);
}

.url-input__save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  flex-shrink: 0;
  transition: color var(--duration-fast) var(--ease-out),
    background var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-spring);
}

.url-input__save-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: rgba(0, 122, 255, 0.04);
}

.url-input__save-btn:active {
  transform: scale(0.9);
}

.url-input__save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.url-input__save-btn:disabled:hover {
  color: var(--color-text-secondary);
  border-color: var(--color-border);
  background: var(--color-bg-primary);
}
</style>
