<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHistoryStore } from '@/stores/history'
import { useCollectionStore } from '@/stores/collection'
import { useRequestEditorStore } from '@/stores/request-editor'
import { useResponseStore } from '@/stores/response'
import { Search } from '@element-plus/icons-vue'

/** 全局搜索对话框组件 - 支持在历史记录和集合中快速搜索请求 */

const { t } = useI18n()
const history = useHistoryStore()
const collections = useCollectionStore()
const editor = useRequestEditorStore()
const response = useResponseStore()

const visible = defineModel<boolean>('visible', { default: false })
const query = ref('') // 搜索关键词
const searchInput = ref<HTMLInputElement | null>(null) // 搜索输入框引用

/**
 * 根据搜索关键词匹配历史记录和集合中的请求
 * 匹配策略:URL、描述、名称中包含关键词(不区分大小写)
 * 限制最多返回 30 条结果,避免列表过长影响性能
 * @returns 搜索结果列表(包含来源、方法、URL、名称和加载函数)
 */
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q || q.length < 2) return [] // 少于 2 个字符时不搜索
  const items: Array<{ source: string; method: string; url: string; name: string; load: () => void }> = []

  // 搜索历史记录
  for (const entry of history.entries) {
    if (
      entry.request.url.toLowerCase().includes(q) ||
      entry.request.description?.toLowerCase().includes(q)
    ) {
      const req = entry.request
      items.push({
        source: 'history',
        method: req.method,
        url: req.url,
        name: req.url,
        load: () => {
          editor.loadRequest(req)
          response.clear()
          visible.value = false
        }
      })
    }
    if (items.length >= 20) break // 历史记录最多 20 条
  }

  // 搜索集合
  for (const col of collections.collections) {
    for (const item of col.items) {
      if (item.type !== 'request') continue
      const matchName = item.name.toLowerCase().includes(q)
      const matchUrl = item.request.url.toLowerCase().includes(q)
      const matchDesc = item.request.description?.toLowerCase().includes(q)
      if (matchName || matchUrl || matchDesc) {
        items.push({
          source: col.name,
          method: item.request.method,
          url: item.request.url,
          name: item.name,
          load: () => {
            editor.loadRequest(item.request)
            response.clear()
            visible.value = false
          }
        })
      }
      if (items.length >= 30) break // 总计最多 30 条
    }
    if (items.length >= 30) break
  }

  return items
})

/**
 * 监听对话框可见性变化
 * 打开时清空搜索词并自动聚焦输入框
 */
watch(visible, (v) => {
  if (v) {
    query.value = ''
    nextTick(() => searchInput.value?.focus())
  }
})

/**
 * 键盘事件处理 - 按 Escape 关闭对话框
 * @param e 键盘事件对象
 */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="t('common.search')"
    width="560px"
    append-to-body
    :close-on-click-modal="true"
    destroy-on-close
    top="10vh"
    @keydown="onKeydown"
  >
    <div class="global-search">
      <div class="global-search__input-wrap">
        <el-icon :size="16" class="global-search__icon"><Search /></el-icon>
        <input
          ref="searchInput"
          v-model="query"
          class="global-search__input"
          :placeholder="t('globalSearch.placeholder')"
          @keydown.esc="visible = false"
        />
      </div>
      <div class="global-search__results">
        <div v-if="query.trim().length < 2" class="global-search__hint">
          {{ t('globalSearch.hint') }}
        </div>
        <div v-else-if="results.length === 0" class="global-search__empty">
          {{ t('globalSearch.noResults') }}
        </div>
        <div
          v-for="(item, i) in results"
          :key="i"
          class="global-search__item"
          @click="item.load()"
        >
          <span class="global-search__source">{{ item.source }}</span>
          <span class="global-search__method" :class="`method--${item.method.toLowerCase()}`">
            {{ item.method }}
          </span>
          <span class="global-search__url">{{ item.url }}</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.global-search__input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-input);
  margin-bottom: var(--space-sm);
}

.global-search__icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.global-search__input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: var(--text-md);
  color: var(--color-text-primary);
  outline: none;
}

.global-search__input::placeholder {
  color: var(--color-text-placeholder);
}

.global-search__results {
  max-height: 360px;
  overflow-y: auto;
}

.global-search__hint,
.global-search__empty {
  padding: var(--space-lg);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.global-search__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  border-radius: var(--radius-sm);
  transition: background var(--duration-fast);
}

.global-search__item:hover {
  background: var(--color-bg-hover);
}

.global-search__source {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  min-width: 56px;
  flex-shrink: 0;
}

.global-search__method {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono);
  min-width: 44px;
  flex-shrink: 0;
}

.method--get    { color: var(--color-method-get); }
.method--post   { color: var(--color-method-post); }
.method--put    { color: var(--color-method-put); }
.method--delete { color: var(--color-method-delete); }
.method--patch  { color: var(--color-method-patch); }
.method--head   { color: var(--color-method-head); }
.method--options{ color: var(--color-method-options); }

.global-search__url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
}
</style>
