<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCollectionStore } from '@/stores/collection'
import { useToast } from '@/composables/useToast'
import { nanoid } from '@/utils/uuid'
import { Plus } from '@element-plus/icons-vue'
import type { HttpRequestConfig, HttpResponseData } from '@/types/request'
import type { ResponseExample } from '@/types/collection'

/**
 * 待保存的请求项接口
 * @property name 请求名称(用于在集合中显示)
 * @property request HTTP 请求配置
 * @property response 可选的响应数据(保存到集合时会创建响应示例)
 */
export interface SaveItem {
  name: string
  request: HttpRequestConfig
  response?: Pick<HttpResponseData, 'status' | 'statusText' | 'body' | 'headers' | 'contentType' | 'bodySize' | 'headerSize' | 'totalTime' | 'cookies' | 'networkDetails'>
}

const { t } = useI18n()
const collections = useCollectionStore()
const toast = useToast()

const visible = defineModel<boolean>('visible', { default: false }) // 对话框可见性(双向绑定)
const props = defineProps<{ items: SaveItem[] }>() // 待保存的请求列表
const emit = defineEmits<{ saved: [] }>() // 保存成功事件

const selectedCollectionId = ref('') // 选中的集合 ID
const isCreating = ref(false) // 是否正在创建新集合
const newCollectionName = ref('') // 新集合的名称

/**
 * 计算属性:生成集合选项列表(包含名称和请求数量)
 * @returns 集合选项数组,每个选项包含 id、name、count
 */
const collectionOptions = computed(() =>
  collections.collections.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.items.length
  }))
)

/**
 * 监听对话框打开状态,重置表单数据
 * 每次打开时清空新建集合标志和名称,默认选中第一个集合
 */
watch(visible, (v) => {
  if (v) {
    isCreating.value = false
    newCollectionName.value = ''
    selectedCollectionId.value = collections.collections[0]?.id || ''
  }
})

/**
 * 处理集合选择变化
 * 如果选择了"新建集合",切换到创建模式;否则退出创建模式并设置选中 ID
 * @param id 选中的集合 ID("__new__" 表示新建)
 */
function onSelect(id: string): void {
  if (id === '__new__') {
    isCreating.value = true
    newCollectionName.value = ''
    selectedCollectionId.value = ''
  } else {
    isCreating.value = false
    selectedCollectionId.value = id
  }
}

/**
 * 执行保存操作
 * 如果在创建模式,先创建新集合;然后将所有请求添加到目标集合
 * 保存成功后关闭对话框并触发 saved 事件
 */
function onSave(): void {
  let targetId = selectedCollectionId.value

  // 如果需要创建新集合
  if (isCreating.value) {
    const name = newCollectionName.value.trim()
    if (!name) return
    const col = collections.createCollection(name)
    targetId = col.id
  }

  if (!targetId) return

  // 批量添加请求到集合,同时携带响应示例
  for (const item of props.items) {
    const newItem = collections.addRequest(targetId, item.name, item.request)

    // 如果有响应数据,自动创建响应示例
    if (item.response) {
      const example: ResponseExample = {
        id: nanoid(),
        name: `${item.response.status} ${item.response.statusText}`,
        status: item.response.status,
        statusText: item.response.statusText,
        headers: item.response.headers,
        body: item.response.body,
        contentType: item.response.contentType,
        bodySize: item.response.bodySize,
        headerSize: item.response.headerSize,
        totalTime: item.response.totalTime,
        cookies: item.response.cookies,
        networkDetails: item.response.networkDetails,
        createdAt: Date.now(),
      }
      collections.addResponseExample(targetId, newItem.id, example)
    }
  }

  toast.success(t('toast.savedToCollection'))
  visible.value = false
  emit('saved')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="t('dialog.saveToCollection')"
    width="480px"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="save-dialog">
      <!-- Items preview -->
      <div class="save-dialog__items">
        <div class="save-dialog__items-label">
          {{ t('dialog.requestsToSave', { count: items.length }) }}
        </div>
        <div class="save-dialog__items-list">
          <div v-for="(item, i) in items" :key="i" class="save-dialog__item">
            <span class="save-dialog__item-method" :class="`method--${item.request.method.toLowerCase()}`">
              {{ item.request.method }}
            </span>
            <span class="save-dialog__item-name">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- Collection selector -->
      <div class="save-dialog__target">
        <div class="save-dialog__target-label">{{ t('dialog.targetCollection') }}</div>

        <el-select
          :model-value="isCreating ? '__new__' : selectedCollectionId"
          style="width: 100%"
          :placeholder="t('dialog.selectCollection')"
          @change="onSelect"
        >
          <el-option
            v-for="c in collectionOptions"
            :key="c.id"
            :value="c.id"
            :label="`${c.name} (${c.count})`"
          />
          <el-option value="__new__" :label="`+ ${t('sidebar.newCollection')}`" />
        </el-select>

        <el-input
          v-if="isCreating"
          v-model="newCollectionName"
          :placeholder="t('dialog.collectionName')"
          style="margin-top: 8px"
          autofocus
          @keydown.enter="onSave"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :disabled="!isCreating ? !selectedCollectionId : !newCollectionName.trim()"
        @click="onSave"
      >
        {{ t('common.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.save-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.save-dialog__items-label,
.save-dialog__target-label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-xs);
}

.save-dialog__items-list {
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg-secondary);
}

.save-dialog__item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.save-dialog__item:last-child { border-bottom: none; }

.save-dialog__item-method {
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

.save-dialog__item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
}
</style>
