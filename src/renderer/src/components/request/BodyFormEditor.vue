<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRequestEditorStore } from '@/stores/request-editor'
import type { FormDataEntry } from '@/types/request'

const { t } = useI18n()
const editor = useRequestEditorStore()

/**
 * 添加新的表单数据行(默认类型为 text)
 * 使用不可变更新确保 Vue 响应式检测
 */
function addRow(): void {
  const rows = [...editor.activeRequest.formData, { key: '', value: '', type: 'text' as const, enabled: true }]
  editor.updateRequest({ formData: rows })
}

/**
 * 删除指定索引的表单数据行
 * @param index 要删除的行索引
 */
function removeRow(index: number): void {
  editor.updateRequest({ formData: editor.activeRequest.formData.filter((_, i) => i !== index) })
}

/**
 * 更新指定行的某个字段
 * 遍历所有行,只更新目标行,其他行保持不变(不可变更新)
 * @param index 行索引
 * @param field 要更新的字段名
 * @param value 新的字段值
 */
function updateRow(index: number, field: keyof FormDataEntry, value: string | boolean): void {
  const rows = editor.activeRequest.formData.map((r, i) =>
    i === index ? { ...r, [field]: value } : r
  )
  editor.updateRequest({ formData: rows })
}

async function selectFile(index: number): Promise<void> {
  const filePath = await window.api.openFile()
  if (filePath) {
    const fileName = filePath.split(/[/\\]/).pop() || filePath
    const rows = editor.activeRequest.formData.map((r, i) =>
      i === index ? { ...r, value: fileName, filePath } : r
    )
    editor.updateRequest({ formData: rows })
  }
}

function toggleType(index: number): void {
  const current = editor.activeRequest.formData[index]
  const newType = current.type === 'text' ? 'file' : 'text'
  updateRow(index, 'type', newType)
}
</script>

<template>
  <div class="form-editor">
    <table class="form-editor__table">
      <thead>
        <tr>
          <th class="form-editor__col-toggle"></th>
          <th class="form-editor__col-key">{{ t('request.key') }}</th>
          <th class="form-editor__col-type">{{ t('bodyForm.type') }}</th>
          <th class="form-editor__col-value">{{ t('request.value') }}</th>
          <th class="form-editor__col-actions"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in editor.activeRequest.formData" :key="index">
          <td>
            <el-checkbox :model-value="row.enabled" @change="updateRow(index, 'enabled', !row.enabled)" />
          </td>
          <td>
            <input
              class="form-editor__input"
              :value="row.key"
              :placeholder="t('request.key')"
              @input="updateRow(index, 'key', ($event.target as HTMLInputElement).value)"
            />
          </td>
          <td>
            <button class="form-editor__type-btn" @click="toggleType(index)">
              {{ row.type === 'file' ? 'File' : 'Text' }}
            </button>
          </td>
          <td>
            <template v-if="row.type === 'text'">
              <input
                class="form-editor__input"
                :value="row.value"
                :placeholder="t('request.value')"
                @input="updateRow(index, 'value', ($event.target as HTMLInputElement).value)"
              />
            </template>
            <template v-else>
              <div class="form-editor__file-row">
                <span class="form-editor__file-name" :title="row.filePath || row.value">
                  {{ row.value || t('request.selectFile') }}
                </span>
                <button class="form-editor__browse" @click="selectFile(index)">...</button>
              </div>
            </template>
          </td>
          <td>
            <button class="form-editor__remove" @click="removeRow(index)">
              <el-icon :size="14"><Close /></el-icon>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <button class="form-editor__add" @click="addRow">+ {{ t('request.addRow') }}</button>
  </div>
</template>

<script lang="ts">
import { Close } from '@element-plus/icons-vue'
export default { components: { Close } }
</script>

<style scoped>
.form-editor__table {
  width: 100%;
  border-collapse: collapse;
}

.form-editor__table th {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.form-editor__table td {
  padding: 2px var(--space-sm);
  border-bottom: 1px solid var(--color-border-light);
}

.form-editor__col-toggle { width: 30px; }
.form-editor__col-type { width: 60px; }
.form-editor__col-actions { width: 30px; }

.form-editor__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-sm);
  font-family: var(--font-family-mono);
  color: var(--color-text-primary);
  padding: var(--space-xs) 0;
}

.form-editor__input::placeholder { color: var(--color-text-placeholder); }

.form-editor__type-btn {
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.form-editor__type-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.form-editor__file-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.form-editor__file-name {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-editor__browse {
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  flex-shrink: 0;
}

.form-editor__remove {
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

.form-editor__remove:hover {
  color: var(--color-danger);
  background: rgba(245, 108, 108, 0.08);
}

.form-editor__add {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: var(--space-sm);
}

.form-editor__add:hover { opacity: 0.8; }
</style>
