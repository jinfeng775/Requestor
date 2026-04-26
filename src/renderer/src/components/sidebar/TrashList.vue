<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTrashStore } from '@/stores/trash'
import { useItemTrashStore } from '@/stores/item-trash'
import { useCollectionStore } from '@/stores/collection'
import { Delete, RefreshRight } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const { t } = useI18n()
const trashStore = useTrashStore()
const itemTrashStore = useItemTrashStore()
const collectionStore = useCollectionStore()

/**
 * 格式化删除时间为人类可读格式(今天/昨天/X天前/日期)
 * @param ts 删除时间的 Unix 时间戳(毫秒)
 * @returns 格式化后的字符串
 */
function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('history.today')
  if (diffDays === 1) return t('history.yesterday')
  if (diffDays < 7) return `${diffDays} ${t('trash.daysAgo')}`
  return d.toLocaleDateString()
}

/**
 * 计算距离自动永久删除还剩多少天
 * 回收站保留期为 30 天,超过后自动清除
 * @param deletedAt 删除时间的时间戳
 * @returns 剩余天数(最少为 0)
 */
function daysRemaining(deletedAt: number): number {
  const elapsed = Date.now() - deletedAt
  const remaining = 30 - Math.floor(elapsed / (1000 * 60 * 60 * 24))
  return Math.max(0, remaining)
}

/**
 * 恢复已删除的集合
 * 从集合回收站中恢复,并添加到集合列表中
 * @param id 集合 ID
 */
async function restoreCollection(id: string): Promise<void> {
  const restored = trashStore.restore(id)
  if (restored) {
    collectionStore.restore(restored)
  }
}

/**
 * 恢复已删除的请求项
 * 从项回收站中恢复到原集合
 * @param id 请求项 ID
 */
async function restoreItem(id: string): Promise<void> {
  itemTrashStore.restore(id)
}

/**
 * 永久删除集合(带二次确认对话框)
 * 从回收站中彻底删除,无法恢复
 * @param id 集合 ID
 * @param name 集合名称(用于确认对话框)
 */
async function permanentlyDeleteCollection(id: string, name: string): Promise<void> {
  try {
    await ElMessageBox.confirm(
      t('dialog.confirmPermanentDelete', { name }),
      t('common.confirm'),
      { confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    trashStore.permanentlyDelete(id)
  } catch { /* cancelled */ }
}

/**
 * 永久删除请求项(带二次确认对话框)
 * 从项回收站中彻底删除,无法恢复
 * @param id 请求项 ID
 * @param name 请求项名称(用于确认对话框)
 */
async function permanentlyDeleteItem(id: string, name: string): Promise<void> {
  try {
    await ElMessageBox.confirm(
      t('dialog.confirmPermanentDelete', { name }),
      t('common.confirm'),
      { confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    itemTrashStore.permanentlyDelete(id)
  } catch { /* cancelled */ }
}

async function clearAllCollections(): Promise<void> {
  if (trashStore.items.length === 0) return
  try {
    await ElMessageBox.confirm(
      t('dialog.confirmClearTrash', { count: trashStore.items.length }),
      t('common.confirm'),
      { confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    trashStore.clearAll()
  } catch { /* cancelled */ }
}

async function clearAllItems(): Promise<void> {
  if (itemTrashStore.items.length === 0) return
  try {
    await ElMessageBox.confirm(
      t('dialog.confirmClearTrash', { count: itemTrashStore.items.length }),
      t('common.confirm'),
      { confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
    itemTrashStore.clearAll()
  } catch { /* cancelled */ }
}

const isEmpty = () => trashStore.items.length === 0 && itemTrashStore.items.length === 0
</script>

<template>
  <div class="trash-list">
    <div class="trash-list__header">
      <span class="trash-list__title">{{ t('trash.autoCleanup') }}</span>
    </div>

    <div class="trash-list__body">
      <div v-if="isEmpty()" class="trash-list__empty">
        <el-icon :size="28" color="var(--color-text-tertiary)"><Delete /></el-icon>
        <p>{{ t('sidebar.emptyTrash') }}</p>
      </div>

      <!-- Collections section -->
      <template v-if="trashStore.items.length > 0">
        <div class="trash-section__header">
          <span class="trash-section__label">{{ t('sidebar.collections') }}</span>
          <el-button size="small" type="danger" text @click="clearAllCollections">
            <el-icon :size="12"><Delete /></el-icon>
            {{ t('trash.clearAll') }}
          </el-button>
        </div>
        <div
          v-for="entry in trashStore.items"
          :key="entry.collection.id"
          class="trash-item"
        >
          <div class="trash-item__info">
            <span class="trash-item__name">{{ entry.collection.name }}</span>
            <span class="trash-item__meta">
              {{ entry.collection.items.length }} {{ t('trash.requests') }} ·
              {{ formatDate(entry.deletedAt) }} ·
              <span class="trash-item__countdown">{{ daysRemaining(entry.deletedAt) }} {{ t('trash.daysLeft') }}</span>
            </span>
          </div>
          <div class="trash-item__actions">
            <el-button
              size="small"
              text
              :title="t('trash.restore')"
              @click="restoreCollection(entry.collection.id)"
            >
              <el-icon :size="14"><RefreshRight /></el-icon>
            </el-button>
            <el-button
              size="small"
              type="danger"
              text
              :title="t('trash.permanentDelete')"
              @click="permanentlyDeleteCollection(entry.collection.id, entry.collection.name)"
            >
              <el-icon :size="14"><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <!-- Items section -->
      <template v-if="itemTrashStore.items.length > 0">
        <div class="trash-section__header">
          <span class="trash-section__label">{{ t('trash.items') }}</span>
          <el-button size="small" type="danger" text @click="clearAllItems">
            <el-icon :size="12"><Delete /></el-icon>
            {{ t('trash.clearAll') }}
          </el-button>
        </div>
        <div
          v-for="entry in itemTrashStore.items"
          :key="entry.id"
          class="trash-item"
        >
          <div class="trash-item__info">
            <span class="trash-item__name">
              <span class="trash-item__method" :class="`method--${entry.item.request.method.toLowerCase()}`">
                {{ entry.item.request.method }}
              </span>
              {{ entry.item.name }}
            </span>
            <span class="trash-item__meta">
              {{ t('trash.fromCollection') }} {{ entry.collectionName }} ·
              {{ formatDate(entry.deletedAt) }} ·
              <span class="trash-item__countdown">{{ daysRemaining(entry.deletedAt) }} {{ t('trash.daysLeft') }}</span>
            </span>
          </div>
          <div class="trash-item__actions">
            <el-button
              size="small"
              text
              :title="t('trash.restore')"
              @click="restoreItem(entry.id)"
            >
              <el-icon :size="14"><RefreshRight /></el-icon>
            </el-button>
            <el-button
              size="small"
              type="danger"
              text
              :title="t('trash.permanentDelete')"
              @click="permanentlyDeleteItem(entry.id, entry.item.name)"
            >
              <el-icon :size="14"><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.trash-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.trash-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.trash-list__title {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trash-list__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-xs) 0;
}

.trash-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xxl) var(--space-lg);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.trash-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-sm);
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
  margin-top: var(--space-xs);
}

.trash-section__label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trash-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-sm);
  transition: background var(--duration-fast);
}

.trash-item:hover { background: var(--color-bg-hover); }

.trash-item__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.trash-item__name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.trash-item__method {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono);
  flex-shrink: 0;
}

.method--get { color: var(--color-method-get); }
.method--post { color: var(--color-method-post); }
.method--put { color: var(--color-method-put); }
.method--delete { color: var(--color-method-delete); }
.method--patch { color: var(--color-method-patch); }
.method--head { color: var(--color-method-head); }
.method--options { color: var(--color-method-options); }

.trash-item__meta {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.trash-item__countdown {
  color: var(--color-danger);
}

.trash-item__actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}
</style>
