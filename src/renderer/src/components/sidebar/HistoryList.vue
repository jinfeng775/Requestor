<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHistoryStore } from '@/stores/history'
import { useRequestEditorStore } from '@/stores/request-editor'
import { useResponseStore } from '@/stores/response'
import { useToast } from '@/composables/useToast'
import { Delete, FolderAdd, VideoPlay, Select } from '@element-plus/icons-vue'
import SaveToCollectionDialog from '../common/SaveToCollectionDialog.vue'
import type { SaveItem } from '../common/SaveToCollectionDialog.vue'
import type { HistoryEntry } from '@/types/history'
import type { HttpResponseData } from '@/types/request'

const { t } = useI18n()
const history = useHistoryStore()
const editor = useRequestEditorStore()
const response = useResponseStore()
const toast = useToast()
const searchQuery = ref('') // 搜索关键词
const filterMethod = ref('') // HTTP 方法筛选
const filterStatus = ref('') // 状态码筛选

// 批量选择模式相关状态
const selectMode = ref(false) // 是否处于批量选择模式
const selectedIds = ref<Set<string>>(new Set()) // 选中的历史记录 ID 集合
const showDialog = ref(false) // 是否显示保存到集合对话框
const dialogItems = ref<SaveItem[]>([]) // 待保存的请求项列表

/**
 * 判断时间戳是否为今天
 * @param ts Unix 时间戳(毫秒)
 * @returns 是否为今天的日期
 */
function isToday(ts: number): boolean {
  const d = new Date(ts)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

/**
 * 判断时间戳是否为昨天
 * @param ts Unix 时间戳(毫秒)
 * @returns 是否为昨天的日期
 */
function isYesterday(ts: number): boolean {
  const d = new Date(ts)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

/**
 * 判断时间戳是否在本周内(7天内)
 * @param ts Unix 时间戳(毫秒)
 * @returns 是否在最近 7 天内
 */
function isThisWeek(ts: number): boolean {
  return Date.now() - ts < 7 * 24 * 60 * 60 * 1000
}

/**
 * 根据搜索条件和筛选条件过滤历史记录条目
 * 支持按 URL、方法名、状态码进行模糊匹配
 * @returns 过滤后的历史记录列表
 */
const filteredEntries = computed(() => {
  let entries = history.entries
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    entries = entries.filter(
      (e) =>
        e.request.url.toLowerCase().includes(q) ||
        e.request.description?.toLowerCase().includes(q)
    )
  }
  // 按 HTTP 方法筛选
  if (filterMethod.value) {
    entries = entries.filter((e) => e.request.method === filterMethod.value)
  }
  // 按状态码范围筛选(2xx/3xx/4xx/5xx/ERR)
  if (filterStatus.value) {
    const prefix = filterStatus.value
    entries = entries.filter((e) => {
      if (!e.response) return prefix === 'ERR' // 无响应时仅匹配 ERR
      const s = e.response.status
      if (prefix === '2xx') return s >= 200 && s < 300
      if (prefix === '3xx') return s >= 300 && s < 400
      if (prefix === '4xx') return s >= 400 && s < 500
      if (prefix === '5xx') return s >= 500
      return true
    })
  }
  return entries
})

/**
 * 将历史记录按时间分组(今天/昨天/本周/更早)
 * @returns 分组后的历史记录列表
 */
const grouped = computed(() => {
  const groups: { label: string; items: HistoryEntry[] }[] = []
  const today: HistoryEntry[] = []
  const yesterday: HistoryEntry[] = []
  const thisWeek: HistoryEntry[] = []
  const older: HistoryEntry[] = []

  for (const entry of filteredEntries.value) {
    if (isToday(entry.timestamp)) today.push(entry)
    else if (isYesterday(entry.timestamp)) yesterday.push(entry)
    else if (isThisWeek(entry.timestamp)) thisWeek.push(entry)
    else older.push(entry)
  }

  if (today.length) groups.push({ label: t('history.today'), items: today })
  if (yesterday.length) groups.push({ label: t('history.yesterday'), items: yesterday })
  if (thisWeek.length) groups.push({ label: t('history.thisWeek'), items: thisWeek })
  if (older.length) groups.push({ label: t('history.older'), items: older })
  return groups
})

/** 当前选中的条目数量 */
const selectedCount = computed(() => selectedIds.value.size)

/**
 * 切换单个条目的选中状态(不可变更新确保响应式检测)
 * @param entryId 历史记录条目 ID
 */
function toggleSelect(entryId: string): void {
  const s = new Set(selectedIds.value)
  if (s.has(entryId)) s.delete(entryId)
  else s.add(entryId)
  selectedIds.value = s
}

/** 进入批量选择模式,清空之前的选择 */
function enterSelectMode(): void {
  selectMode.value = true
  selectedIds.value = new Set()
}

/** 退出批量选择模式,清空选择 */
function exitSelectMode(): void {
  selectMode.value = false
  selectedIds.value = new Set()
}

/**
 * 生成历史记录的显示名称
 * 优先提取 URL 的最后两段路径,如果没有则显示主机名
 * @param entry 历史记录条目
 * @returns 格式化的显示名称(如 "GET /api/users")
 */
function entryName(entry: HistoryEntry): string {
  const { method, url } = entry.request
  if (!url) return method
  try {
    const u = new URL(url)
    const segs = u.pathname.split('/').filter(Boolean)
    const last = segs.slice(-2).join('/')
    return `${method} /${last || u.hostname}`
  } catch {
    // URL 格式不正确时,直接处理字符串
    const segs = url.split('?')[0].split('/').filter(Boolean)
    const last = segs.slice(-2).join('/')
    return `${method} /${last || url}`
  }
}

/**
 * 点击历史记录条目时的处理逻辑
 * 如果在批量选择模式下,切换选中状态;否则加载请求到编辑器
 * 如果有保存的响应体,同时恢复到响应查看器
 * @param entry 历史记录条目
 */
function loadEntry(entry: HistoryEntry): void {
  if (selectMode.value) {
    toggleSelect(entry.id)
  } else {
    editor.loadRequest(entry.request)
    // 如果有保存的完整响应,恢复到响应查看器
    if (entry.responseBody !== undefined && entry.response) {
      response.setData({
        status: entry.response.status,
        statusText: entry.response.statusText,
        headers: entry.responseHeaders || {},
        body: entry.responseBody,
        bodySize: entry.response.bodySize,
        headerSize: entry.responseHeaderSize ?? entry.responseNetworkDetails?.response?.headerSize ?? 0,
        totalTime: entry.response.totalTime,
        contentType: entry.responseContentType || '',
        cookies: entry.responseCookies || [],
        networkDetails: entry.responseNetworkDetails,
      } as HttpResponseData)
    } else {
      response.clear()
    }
  }
}

/**
 * 从历史条目构建 SaveItem,包含响应数据(如果有)
 * @param entry 历史记录条目
 * @returns SaveItem 对象
 */
function entryToSaveItem(entry: HistoryEntry): SaveItem {
  const item: SaveItem = { name: entryName(entry), request: entry.request }
  // 如果有保存的响应体,附加响应数据
  if (entry.responseBody !== undefined && entry.response) {
    item.response = {
      status: entry.response.status,
      statusText: entry.response.statusText,
      body: entry.responseBody,
      headers: entry.responseHeaders || {},
      contentType: entry.responseContentType || '',
      bodySize: entry.response.bodySize,
      headerSize: entry.responseHeaderSize ?? entry.responseNetworkDetails?.response.headerSize ?? 0,
      totalTime: entry.response.totalTime,
      cookies: entry.responseCookies || [],
      networkDetails: entry.responseNetworkDetails,
    }
  }
  return item
}

/**
 * 将单个历史记录保存到集合(打开保存对话框)
 * @param entry 历史记录条目
 */
function saveSingleToCollection(entry: HistoryEntry): void {
  dialogItems.value = [entryToSaveItem(entry)]
  showDialog.value = true
}

/**
 * 将选中的多个历史记录批量保存到集合
 * 遍历所有分组,收集选中的条目,然后打开保存对话框
 */
function saveSelectedToCollection(): void {
  const items: SaveItem[] = []
  for (const group of grouped.value) {
    for (const entry of group.items) {
      if (selectedIds.value.has(entry.id)) {
        items.push(entryToSaveItem(entry))
      }
    }
  }
  if (items.length === 0) return
  dialogItems.value = items
  showDialog.value = true
}

/** 保存对话框关闭后的回调,退出批量选择模式 */
function onDialogSaved(): void {
  exitSelectMode()
}

/**
 * 格式化时间戳为 HH:MM 格式
 * @param ts Unix 时间戳(毫秒)
 * @returns 格式化后的时间字符串(如 "14:30")
 */
function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/**
 * 根据 HTTP 状态码返回对应的 CSS 类名(用于颜色区分)
 * @param status HTTP 状态码
 * @returns CSS 类名(如 "status--2xx", "status--4xx")
 */
function getStatusClass(status?: number): string {
  if (!status) return ''
  if (status >= 200 && status < 300) return 'status--2xx'
  if (status >= 300 && status < 400) return 'status--3xx'
  if (status >= 400 && status < 500) return 'status--4xx'
  return 'status--5xx'
}
</script>

<template>
  <div class="history-list">
    <div class="history-list__header">
      <el-input
        v-model="searchQuery"
        :placeholder="t('common.search')"
        size="small"
        clearable
        :prefix-icon="undefined"
      />
      <el-select v-model="filterMethod" size="small" clearable :placeholder="t('request.method')" style="width: 90px">
        <el-option value="GET" label="GET" />
        <el-option value="POST" label="POST" />
        <el-option value="PUT" label="PUT" />
        <el-option value="DELETE" label="DELETE" />
        <el-option value="PATCH" label="PATCH" />
      </el-select>
      <el-select v-model="filterStatus" size="small" clearable :placeholder="t('response.status')" style="width: 80px">
        <el-option value="2xx" label="2xx" />
        <el-option value="3xx" label="3xx" />
        <el-option value="4xx" label="4xx" />
        <el-option value="5xx" label="5xx" />
        <el-option value="ERR" label="ERR" />
      </el-select>
      <template v-if="!selectMode">
        <el-button
          v-if="history.entries.length > 0"
          size="small"
          text
          :title="t('history.selectMode')"
          @click="enterSelectMode"
        >
          <el-icon :size="14"><Select /></el-icon>
        </el-button>
        <el-button
          v-if="history.entries.length > 0"
          size="small"
          text
          type="danger"
          @click="history.clearAll()"
        >
          {{ t('sidebar.clearHistory') }}
        </el-button>
      </template>
      <template v-else>
        <el-button size="small" type="primary" text :disabled="selectedCount === 0" @click="saveSelectedToCollection">
          {{ t('history.saveSelected', { count: selectedCount }) }}
        </el-button>
        <el-button size="small" text @click="exitSelectMode">
          {{ t('common.cancel') }}
        </el-button>
      </template>
    </div>

    <div v-if="grouped.length === 0" class="history-list__empty">
      <p>{{ t('history.empty') }}</p>
    </div>

    <div v-for="group in grouped" :key="group.label" class="history-group">
      <div class="history-group__label">{{ group.label }}</div>
      <div
        v-for="entry in group.items"
        :key="entry.id"
        :class="['history-item', { 'history-item--selected': selectedIds.has(entry.id) }]"
        @click="loadEntry(entry)"
      >
        <input
          v-if="selectMode"
          type="checkbox"
          :checked="selectedIds.has(entry.id)"
          class="history-item__checkbox"
          @click.stop="toggleSelect(entry.id)"
        />
        <div class="history-item__body">
          <div class="history-item__main">
            <span class="history-item__method" :class="`method--${entry.request.method.toLowerCase()}`">
              {{ entry.request.method }}
            </span>
            <span class="history-item__url" :title="entry.request.url">
              {{ entry.request.url.replace(/^https?:\/\//, '') }}
            </span>
          </div>
          <div v-if="entry.request.description" class="history-item__desc" :title="entry.request.description.slice(0, 300)">
            {{ entry.request.description }}
          </div>
        </div>
        <span v-if="entry.response" class="history-item__status" :class="getStatusClass(entry.response.status)">
          {{ entry.response.status }}
        </span>
        <span v-else class="history-item__error" :title="t('responseView.error')">ERR</span>
        <span class="history-item__time">{{ formatTime(entry.timestamp) }}</span>
        <div v-if="!selectMode" class="history-item__actions">
          <el-icon :size="12" :title="t('history.rerun')" @click.stop="editor.loadRequest(entry.request)"><VideoPlay /></el-icon>
          <el-icon :size="12" :title="t('history.saveToCollection')" @click.stop="saveSingleToCollection(entry)"><FolderAdd /></el-icon>
          <el-icon :size="12" @click.stop="history.deleteEntry(entry.id)"><Delete /></el-icon>
        </div>
      </div>
    </div>

    <SaveToCollectionDialog
      v-model:visible="showDialog"
      :items="dialogItems"
      @saved="onDialogSaved"
    />
  </div>
</template>

<style scoped>
.history-list__header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}

.history-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.history-group__label {
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 3px var(--space-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: background var(--duration-fast);
}

.history-item:hover { background: var(--color-bg-hover); }
.history-item--selected { background: var(--color-bg-active); }

.history-item__checkbox {
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--color-accent);
}

.history-item__method {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono);
  min-width: 40px;
  flex-shrink: 0;
}

.method--get    { color: var(--color-method-get); }
.method--post   { color: var(--color-method-post); }
.method--put    { color: var(--color-method-put); }
.method--delete { color: var(--color-method-delete); }
.method--patch  { color: var(--color-method-patch); }
.method--head   { color: var(--color-method-head); }
.method--options{ color: var(--color-method-options); }

.history-item__url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
}

.history-item__body {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.history-item__main {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.history-item__desc {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: calc(40px + var(--space-xs));
  line-height: 1.4;
}

.history-item__status {
  font-size: var(--text-xs);
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}

.status--2xx { color: var(--color-status-2xx); }
.status--3xx { color: var(--color-status-3xx); }
.status--4xx { color: var(--color-status-4xx); }
.status--5xx { color: var(--color-status-5xx); }

.history-item__error {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-danger);
  flex-shrink: 0;
}

.history-item__time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.history-item__actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--duration-fast);
  color: var(--color-text-tertiary);
}

.history-item:hover .history-item__actions { opacity: 1; }
.history-item__actions .el-icon:hover { color: var(--color-accent); cursor: pointer; }
</style>
