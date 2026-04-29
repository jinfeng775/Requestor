<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCollectionStore } from '@/stores/collection'
import { useTrashStore } from '@/stores/trash'
import { useItemTrashStore } from '@/stores/item-trash'
import { useRequestEditorStore } from '@/stores/request-editor'
import { useResponseStore } from '@/stores/response'
import { useTabStore } from '@/stores/tab'
import { useToast } from '@/composables/useToast'
import {
  FolderOpened,
  Plus,
  Delete,
  Edit,
  Select,
  DocumentCopy,
  Position,
  Document,
  Tickets
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import draggable from 'vuedraggable'
import { collectionToPostmanV21 } from '@/utils/postman-export'
import { collectionToHtmlDoc } from '@/utils/html-doc-export'
import { parsePostmanCollections } from '@/utils/postman-import'
import type { CollectionItem, CollectionRequest } from '@/types/collection'

const { t } = useI18n()
const collectionStore = useCollectionStore()
const trashStore = useTrashStore()
const itemTrashStore = useItemTrashStore()
const editor = useRequestEditorStore()
const response = useResponseStore()
const tabStore = useTabStore()
const toast = useToast()

function isCollectionRequest(item: CollectionItem): item is CollectionRequest {
  return item.type === 'request'
}

/** 已展开的集合 ID 集合 */
const expandedIds = ref<Set<string>>(new Set())
/** 正在重命名的项 ID */
const editingId = ref<string | null>(null)
/** 重命名输入框的临时值 */
const editingName = ref('')
/** 正在重命名的是否为请求项(而非集合) */
const editingIsItem = ref(false)
/** 正在重命名的请求所属的集合 ID */
const editingCollectionId = ref<string | null>(null)
/** 重命名输入框的 DOM 引用 */
const renameInput = ref<HTMLInputElement | null>(null)
/** 右键菜单状态 */
const contextMenu = ref<{
  show: boolean
  x: number
  y: number
  collectionId: string
  itemId?: string
}>({
  show: false,
  x: 0,
  y: 0,
  collectionId: ''
})

// Batch select - 批量选择模式
/** 是否处于批量选择模式 */
const selectMode = ref(false)
/** 已选中的项 ID 集合 */
const selectedIds = ref<Set<string>>(new Set())
/** 已选中项的数量 */
const selectedCount = computed(() => selectedIds.value.size)

// Drag and drop state - 拖拽状态
/** 拖拽源集合 ID */
const dragSourceCollectionId = ref<string | null>(null)

/** 判断请求项是否为当前加载的项 */
const isActiveItem = computed(() => (itemId: string) => {
  return editor.sourceItemId === itemId
})

/**
 * 切换集合的展开/折叠状态
 * 在批量选择模式下禁用此功能,避免误操作
 * @param id 集合 ID
 */
function toggleExpand(id: string): void {
  if (selectMode.value) return // 批量选择模式下不允许展开/折叠
  if (expandedIds.value.has(id)) expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

/**
 * 切换项的选中状态(用于批量选择)
 * 使用不可变更新方式(Set 拷贝),确保 Vue 能检测到变化
 * @param id 项 ID(集合或请求)
 */
function toggleSelect(id: string): void {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

/**
 * 进入批量选择模式,清空已选项
 */
function enterSelectMode(): void {
  selectMode.value = true
  selectedIds.value = new Set()
}

/**
 * 退出批量选择模式,清空已选项
 */
function exitSelectMode(): void {
  selectMode.value = false
  selectedIds.value = new Set()
}

/**
 * 创建新集合并立即进入重命名状态
 * 自动展开新创建的集合,方便用户查看
 */
function newCollection(): void {
  const c = collectionStore.createCollection(t('sidebar.newCollection'))
  expandedIds.value.add(c.id)
  startRename(c.id, c.name)
}

/**
 * 开始拖拽时记录源集合 ID
 * @param collectionId 源集合 ID
 */
function onDragStart(collectionId: string): void {
  dragSourceCollectionId.value = collectionId
}

/**
 * 拖拽结束后清理状态
 */
function onDragEnd(): void {
  dragSourceCollectionId.value = null
}

/**
 * 列表变化时处理（拖拽完成）
 * @param evt vuedraggable 的 change 事件
 * @param targetCollectionId 目标集合 ID
 */
function onListChange(evt: any, targetCollectionId: string): void {
  // 如果有项被添加到此集合（从其他集合拖入）
  if (evt.added) {
    const addedItem = evt.added.element
    // 如果拖入的项是当前编辑器加载的项，更新编辑器的源集合引用
    if (addedItem.type === 'request' && editor.sourceItemId === addedItem.id && dragSourceCollectionId.value !== targetCollectionId) {
      editor.loadRequest(addedItem.request, targetCollectionId, addedItem.id)
    }
  }
  // 持久化更改
  nextTick(() => {
    collectionStore.triggerPersist()
  })
}

/**
 * 开始重命名集合或请求项
 * 关闭右键菜单并聚焦到重命名输入框
 * @param id 要重命名的项 ID
 * @param currentName 当前名称
 * @param isItem 是否为请求项(默认为 false,即集合)
 * @param collectionId 如果是请求项,需要传入所属集合 ID
 */
function startRename(id: string, currentName: string, isItem = false, collectionId?: string): void {
  editingId.value = id
  editingName.value = currentName
  editingIsItem.value = isItem
  editingCollectionId.value = collectionId || null
  closeContextMenu()
  nextTick(() => renameInput.value?.focus()) // 等待 DOM 更新后聚焦
}

/**
 * 完成重命名操作
 * 根据 isItem 标志决定调用集合重命名还是请求项重命名
 */
function finishRename(): void {
  if (editingId.value && editingName.value.trim()) {
    if (editingIsItem.value && editingCollectionId.value) {
      collectionStore.renameItem(
        editingCollectionId.value,
        editingId.value,
        editingName.value.trim()
      )
    } else {
      collectionStore.renameCollection(editingId.value, editingName.value.trim())
    }
  }
  editingId.value = null
  editingIsItem.value = false
  editingCollectionId.value = null
}

/**
 * 加载请求到编辑器
 * 如果有保存的响应示例,自动回填最新的响应数据到响应区
 * @param collectionId 所属集合 ID
 * @param itemId 请求项 ID
 */
function loadRequest(collectionId: string, itemId: string): void {
  // 从最新的集合数据中查找请求项
  const col = collectionStore.collections.find((c) => c.id === collectionId)
  const item = col?.items.find((i) => i.id === itemId)

  if (!item || item.type !== 'request') return

  editor.loadRequest(item.request, collectionId, item.id)
  const examples = item.responseExamples
  if (examples && examples.length > 0) {
    const latest = examples[0]
    response.setData({
      status: latest.status,
      statusText: latest.statusText,
      headers: latest.headers,
      body: latest.body,
      bodySize: latest.bodySize,
      headerSize: latest.headerSize ?? latest.networkDetails?.response?.headerSize ?? 0,
      totalTime: latest.totalTime,
      contentType: latest.contentType,
      cookies: latest.cookies,
      networkDetails: latest.networkDetails
    })
  } else {
    response.clear()
  }
}

/**
 * 显示右键菜单
 * @param e 鼠标事件
 * @param collectionId 集合 ID
 * @param itemId 可选的请求项 ID(如果是在请求上右键)
 */
function onContextMenu(e: MouseEvent, collectionId: string, itemId?: string): void {
  e.preventDefault()
  contextMenu.value = { show: true, x: e.clientX, y: e.clientY, collectionId, itemId }
}

/**
 * 关闭右键菜单
 */
function closeContextMenu(): void {
  contextMenu.value.show = false
}

/**
 * 点击文档任意位置时关闭右键菜单
 */
function onDocumentClick(): void {
  if (contextMenu.value.show) {
    contextMenu.value.show = false
  }
}

// 组件挂载时注册全局点击监听器,卸载时移除
onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

/**
 * 确认删除集合(带二次确认对话框)
 * 删除前将集合移入回收站,支持后续恢复
 * @param id 集合 ID
 */
async function confirmDeleteCollection(id: string): Promise<void> {
  const col = collectionStore.collections.find((c) => c.id === id)
  if (!col) return
  try {
    await ElMessageBox.confirm(
      t('dialog.confirmDeleteCollection', { name: col.name }),
      t('common.confirm'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    const deleted = collectionStore.deleteCollection(id)
    if (deleted) trashStore.trashCollection(deleted) // 移入回收站
    closeContextMenu()
  } catch {
    /* cancelled */
  }
}

/**
 * 确认删除请求项(带二次确认对话框)
 * 删除前将请求移入项回收站,保存集合信息以便恢复时重建
 * @param collectionId 所属集合 ID
 * @param itemId 请求项 ID
 */
async function confirmDeleteItem(collectionId: string, itemId: string): Promise<void> {
  try {
    await ElMessageBox.confirm(t('dialog.confirmDeleteRequest'), t('common.confirm'), {
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    const col = collectionStore.collections.find((c) => c.id === collectionId)
    const item = col?.items.find((i) => i.id === itemId)
    if (col && item && isCollectionRequest(item)) {
      itemTrashStore.trashItem(item, collectionId, col.name)
    }
    collectionStore.deleteItem(collectionId, itemId)
    closeContextMenu()
  } catch {
    /* cancelled */
  }
}

/**
 * 确认批量删除(带二次确认对话框)
 * 遍历所有选中项,判断是集合还是请求项,分别执行删除并移入对应回收站
 */
async function confirmBatchDelete(): Promise<void> {
  const count = selectedIds.value.size
  try {
    await ElMessageBox.confirm(t('dialog.confirmBatchDelete', { count }), t('common.confirm'), {
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    for (const id of selectedIds.value) {
      const col = collectionStore.collections.find((c) => c.id === id)
      if (col) {
        const deleted = collectionStore.deleteCollection(id)
        if (deleted) trashStore.trashCollection(deleted)
      } else {
        for (const c of collectionStore.collections) {
          const item = c.items.find((i) => i.id === id)
          if (item && isCollectionRequest(item)) {
            itemTrashStore.trashItem(item, c.id, c.name)
            collectionStore.deleteItem(c.id, id)
            break
          }
        }
      }
    }
    exitSelectMode()
  } catch {
    /* cancelled */
  }
}

/**
 * 将当前标签页的请求添加到指定集合
 * 自动展开目标集合,方便用户查看新增的请求
 * @param collectionId 目标集合 ID
 */
function addRequestToCollection(collectionId: string): void {
  const tabName = tabStore.activeTab?.name || 'Untitled'
  collectionStore.addRequest(collectionId, tabName, editor.activeRequest)
  if (!expandedIds.value.has(collectionId)) expandedIds.value.add(collectionId)
  closeContextMenu()
  toast.success(t('toast.savedToCollection'))
}

/**
 * 导出单个集合为 Postman Collection v2.1 JSON
 * @param collectionId 集合 ID (不传则导出所有集合)
 */
async function exportPostman(collectionId?: string): Promise<void> {
  if (!window.api) return

  let collection = collectionStore.collections.length === 1
    ? collectionStore.collections[0]
    : null

  if (collectionId) {
    collection = null
    for (const existingCollection of collectionStore.collections) {
      if (existingCollection.id === collectionId) {
        collection = existingCollection
        break
      }
    }
  }

  if (!collection) return

  const postmanData = collectionToPostmanV21(collection)
  const filePath = await window.api.saveFile(`${collection.name}.postman_collection.json`)
  if (!filePath) return
  const data = JSON.stringify(postmanData, null, 2)
  const result = await window.api.writeFile(filePath, data)
  if (result.success) {
    toast.success(t('toast.postmanExportSuccess'))
  } else {
    toast.error(result.error || 'Export failed')
  }
}

/**
 * 导出单个集合为 HTML 接口文档
 * @param collectionId 集合 ID
 */
async function exportHtmlDoc(collectionId: string): Promise<void> {
  if (!window.api) return
  const col = collectionStore.collections.find((c) => c.id === collectionId)
  if (!col) return
  const currentLocale = localStorage.getItem('requestor-language') || 'zh-CN'
  const html = collectionToHtmlDoc(col, currentLocale as 'zh-CN' | 'en-US')
  const filePath = await window.api.saveFile(`${col.name}.html`)
  if (!filePath) return
  const result = await window.api.writeFile(filePath, html)
  if (result.success) {
    toast.success(t('toast.htmlDocExportSuccess'))
  } else {
    toast.error(result.error || 'Export failed')
  }
}

/**
 * 从 Postman Collection JSON 文件导入集合
 */
async function importPostmanCollections(): Promise<void> {
  if (!window.api) return
  const filePath = await window.api.openJsonFile()
  if (!filePath) return
  const result = await window.api.readFile(filePath)
  if (!result.success) {
    toast.error(result.error || 'Import failed')
    return
  }

  try {
    const parsed = JSON.parse(result.content ?? '')
    const collections = parsePostmanCollections(parsed)

    if (!collections) {
      toast.error(t('toast.postmanImportError'))
      return
    }

    for (const collection of collections) {
      collectionStore.restore(collection, { trustScripts: false })
      expandedIds.value.add(collection.id)
    }

    toast.success(t('toast.postmanImportSuccess', { count: collections.length }))
  } catch {
    toast.error(t('toast.postmanImportError'))
  }
}

/**
 * 复制请求项(在当前集合中创建副本)
 * 在原名称后添加 " (copy)" 后缀以示区分
 * @param collectionId 所属集合 ID
 * @param itemId 要复制的请求项 ID
 */
function duplicateItem(collectionId: string, itemId: string): void {
  const col = collectionStore.collections.find((c) => c.id === collectionId)
  const item = col?.items.find((i) => i.id === itemId)
  if (item && item.type === 'request') {
    collectionStore.addRequest(collectionId, item.name + ' (copy)', item.request)
    if (!expandedIds.value.has(collectionId)) expandedIds.value.add(collectionId)
    toast.success(t('toast.itemDuplicated'))
  }
  closeContextMenu()
}

/**
 * 加载请求项到编辑器(从右键菜单)
 * @param collectionId 所属集合 ID
 * @param itemId 请求项 ID
 */
function loadItem(collectionId: string, itemId: string): void {
  loadRequest(collectionId, itemId)
  closeContextMenu()
}

/**
 * 开始重命名请求项(从右键菜单)
 * @param collectionId 所属集合 ID
 * @param itemId 请求项 ID
 */
function startItemRename(collectionId: string, itemId: string): void {
  const col = collectionStore.collections.find((c) => c.id === collectionId)
  const item = col?.items.find((i) => i.id === itemId)
  if (item) {
    startRename(itemId, item.name, true, collectionId)
  }
}
</script>

<template>
  <div class="collection-tree">
    <div class="collection-tree__header">
      <template v-if="!selectMode">
        <el-button
          size="small"
          type="primary"
          plain
          @click="newCollection"
        >
          <el-icon>
            <Plus />
          </el-icon>
          {{ t('sidebar.newCollection') }}
        </el-button>
        <el-button
          v-if="collectionStore.collections.length > 0"
          size="small"
          text
          :title="t('history.selectMode')"
          @click="enterSelectMode"
        >
          <el-icon :size="14"><Select /></el-icon>
          {{ t('history.selectMode') }}
        </el-button>
        <el-dropdown trigger="click">
          <el-button size="small" text :title="t('collection.postmanMenu')">
            <el-icon :size="14"><Tickets /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="importPostmanCollections()">
                {{ t('collection.importPostman') }}
              </el-dropdown-item>
              <el-dropdown-item :disabled="collectionStore.collections.length !== 1" @click="exportPostman()">
                {{ t('collection.exportPostman') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
      <template v-else>
        <el-button
          size="small"
          type="danger"
          text
          :disabled="selectedCount === 0"
          @click="confirmBatchDelete"
        >
          <el-icon>
            <Delete />
          </el-icon>
          {{ t('common.delete') }} ({{ selectedCount }})
        </el-button>
        <el-button
          size="small"
          text
          @click="exitSelectMode"
        >
          {{ t('common.cancel') }}
        </el-button>
      </template>
    </div>

    <div class="collection-tree__list">
      <div
        v-if="collectionStore.collections.length === 0"
        class="collection-tree__empty"
      >
        <el-icon
          :size="28"
          color="var(--color-text-tertiary)"
        >
          <FolderOpened />
        </el-icon>
        <p>{{ t('sidebar.emptyCollections') }}</p>
      </div>

      <div
        v-for="col in collectionStore.collections"
        :key="col.id"
        class="collection"
      >
        <div
          class="collection__header"
          :class="{ 'collection__header--selected': selectedIds.has(col.id) }"
          @click="toggleExpand(col.id)"
          @contextmenu="onContextMenu($event, col.id)"
        >
          <input
            v-if="selectMode"
            type="checkbox"
            :checked="selectedIds.has(col.id)"
            class="collection__checkbox"
            @click.stop="toggleSelect(col.id)"
          />
          <span
            v-else
            class="collection__arrow"
          >{{ expandedIds.has(col.id) ? '▼' : '▶' }}</span>
          <el-icon :size="14">
            <FolderOpened />
          </el-icon>
          <template v-if="editingId === col.id">
            <input
              ref="renameInput"
              v-model="editingName"
              class="collection__rename-input"
              @blur="finishRename"
              @keydown.enter="finishRename"
              @keydown.escape="editingId = null"
              @click.stop
            />
          </template>
          <template v-else>
            <span class="collection__name">{{ col.name }}</span>
          </template>
          <span class="collection__count">{{ col.items.length }}</span>
        </div>

        <draggable
          v-if="expandedIds.has(col.id)"
          :list="col.items"
          :group="'collections'"
          :disabled="selectMode"
          item-key="id"
          class="collection__items"
          ghost-class="ghost-item"
          @start="onDragStart(col.id)"
          @end="onDragEnd"
          @change="onListChange($event, col.id)"
        >
          <template #item="{ element: item }">
            <div
              :key="item.id"
              class="request-item"
              :class="{
                'request-item--selected': selectedIds.has(item.id),
                'request-item--active': !selectMode && isActiveItem(item.id)
              }"
              @click="selectMode ? toggleSelect(item.id) : (item.type === 'request' ? loadRequest(col.id, item.id) : undefined)"
              @contextmenu="onContextMenu($event, col.id, item.id)"
            >
              <input
                v-if="selectMode"
                type="checkbox"
                :checked="selectedIds.has(item.id)"
                class="request-item__checkbox"
                @click.stop="toggleSelect(item.id)"
              />
              <span
                v-if="item.type === 'request'"
                class="request-item__method"
                :class="`method--${item.request.method.toLowerCase()}`"
              >
                {{ item.request.method }}
              </span>
              <el-icon
                v-else
                :size="12"
              >
                <FolderOpened />
              </el-icon>
              <template v-if="editingId === item.id && editingIsItem">
                <input
                  ref="renameInput"
                  v-model="editingName"
                  class="request-item__rename-input"
                  @blur="finishRename"
                  @keydown.enter="finishRename"
                  @keydown.escape="editingId = null"
                  @click.stop
                />
              </template>
              <template v-else>
                <div class="request-item__info">
                  <span class="request-item__name">{{ item.name }}</span>
                  <span
                    v-if="item.type === 'request' && item.request.description"
                    class="request-item__desc"
                    :title="item.request.description.slice(0, 300)"
                  >
                    {{ item.request.description }}
                  </span>
                </div>
                <span
                  v-if="item.type === 'request' && item.responseExamples && item.responseExamples.length > 0"
                  class="request-item__examples"
                  :title="t('collection.responseExamples')"
                >
                  {{ item.responseExamples.length }}
                </span>
              </template>
            </div>
          </template>
        </draggable>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <template v-if="!contextMenu.itemId">
          <div
            class="context-menu__item"
            @click="addRequestToCollection(contextMenu.collectionId)"
          >
            <el-icon>
              <Plus />
            </el-icon> {{ t('sidebar.newRequest') }}
          </div>
          <div
            class="context-menu__item"
            @click="startRename(contextMenu.collectionId, collectionStore.collections.find(c => c.id === contextMenu.collectionId)?.name || '')"
          >
            <el-icon>
              <Edit />
            </el-icon> {{ t('common.rename') }}
          </div>
          <div class="context-menu__divider"></div>
          <div
            class="context-menu__item"
            @click="exportPostman(contextMenu.collectionId)"
          >
            <el-icon><Tickets /></el-icon> {{ t('collection.exportPostman') }}
          </div>
          <div
            class="context-menu__item"
            @click="exportHtmlDoc(contextMenu.collectionId)"
          >
            <el-icon><Document /></el-icon> {{ t('collection.exportHtmlDoc') }}
          </div>
          <div class="context-menu__divider"></div>
          <div
            class="context-menu__item context-menu__item--danger"
            @click="confirmDeleteCollection(contextMenu.collectionId)"
          >
            <el-icon>
              <Delete />
            </el-icon> {{ t('sidebar.deleteCollection') }}
          </div>
        </template>
        <template v-else>
          <div
            class="context-menu__item"
            @click="loadItem(contextMenu.collectionId, contextMenu.itemId || '')"
          >
            <el-icon>
              <Position />
            </el-icon> {{ t('common.load') }}
          </div>
          <div
            class="context-menu__item"
            @click="startItemRename(contextMenu.collectionId, contextMenu.itemId || '')"
          >
            <el-icon>
              <Edit />
            </el-icon> {{ t('common.rename') }}
          </div>
          <div
            class="context-menu__item"
            @click="duplicateItem(contextMenu.collectionId, contextMenu.itemId || '')"
          >
            <el-icon>
              <DocumentCopy />
            </el-icon> {{ t('common.duplicate') }}
          </div>
          <div class="context-menu__divider"></div>
          <div
            class="context-menu__item context-menu__item--danger"
            @click="confirmDeleteItem(contextMenu.collectionId, contextMenu.itemId || '')"
          >
            <el-icon>
              <Delete />
            </el-icon> {{ t('sidebar.deleteRequest') }}
          </div>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.collection-tree__header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.collection-tree__list {
  padding: var(--space-xs) 0;
}

.collection-tree__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xxl) var(--space-lg);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.collection__header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  transition: background var(--duration-fast);
}

.collection__header:hover {
  background: var(--color-bg-hover);
}
.collection__header--selected {
  background: var(--color-bg-active);
}

.collection__checkbox {
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--color-accent);
}

.collection__arrow {
  font-size: 9px;
  color: var(--color-text-tertiary);
  width: 12px;
  text-align: center;
  flex-shrink: 0;
}

.collection__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--font-weight-medium);
}

.collection__count {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 0 5px;
  border-radius: 8px;
  flex-shrink: 0;
}

.collection__rename-input {
  flex: 1;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  padding: 1px 4px;
  font-size: var(--text-sm);
  outline: none;
  background: var(--color-bg-input);
  color: var(--color-text-primary);
}

.collection__items {
  padding-left: 12px;
}

.request-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 3px var(--space-sm) 3px 16px;
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: background var(--duration-fast);
}

.request-item:hover {
  background: var(--color-bg-hover);
}
.request-item--selected {
  background: var(--color-bg-active);
}

.request-item--active {
  background: var(--color-bg-hover);
  border-left: 2px solid var(--color-accent);
  padding-left: 14px;
}

.request-item__checkbox {
  flex-shrink: 0;
  cursor: pointer;
  accent-color: var(--color-accent);
}

.request-item__method {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-family-mono);
  min-width: 44px;
  flex-shrink: 0;
}

.method--get {
  color: var(--color-method-get);
}
.method--post {
  color: var(--color-method-post);
}
.method--put {
  color: var(--color-method-put);
}
.method--delete {
  color: var(--color-method-delete);
}
.method--patch {
  color: var(--color-method-patch);
}
.method--head {
  color: var(--color-method-head);
}
.method--options {
  color: var(--color-method-options);
}

.request-item__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-item__info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.request-item__desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.request-item__rename-input {
  flex: 1;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  padding: 1px 4px;
  font-size: var(--text-sm);
  outline: none;
  background: var(--color-bg-input);
  color: var(--color-text-primary);
}

.request-item__examples {
  font-size: 10px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 0 5px;
  border-radius: 8px;
  flex-shrink: 0;
  line-height: 16px;
}

.context-menu {
  position: fixed;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dropdown);
  padding: var(--space-xs) 0;
  min-width: 160px;
  z-index: var(--z-dropdown);
}

.context-menu__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--duration-fast);
}

.context-menu__item:hover {
  background: var(--color-bg-hover);
}
.context-menu__item--danger:hover {
  color: var(--color-danger);
}
.context-menu__divider {
  height: 1px;
  background: var(--color-border-light);
  margin: var(--space-xs) 0;
}

.ghost-item {
  opacity: 0.5;
  background: var(--color-accent);
  border-radius: var(--radius-sm);
}

.collection__items {
  min-height: 20px;
}
</style>
